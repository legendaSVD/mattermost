package sharedchannel
import (
	"context"
	"encoding/json"
	"fmt"
	"strings"
	"sync"
	"time"
	"github.com/wiggin77/merror"
	"github.com/mattermost/mattermost/server/public/model"
	"github.com/mattermost/mattermost/server/public/shared/mlog"
	"github.com/mattermost/mattermost/server/public/shared/request"
	"github.com/mattermost/mattermost/server/v8/channels/store"
	"github.com/mattermost/mattermost/server/v8/platform/services/remotecluster"
)
type sendSyncMsgResultFunc func(syncResp model.SyncResponse, err error)
type attachment struct {
	fi   *model.FileInfo
	post *model.Post
}
type syncData struct {
	task syncTask
	rc   *model.RemoteCluster
	scr  *model.SharedChannelRemote
	users             map[string]*model.User
	profileImages     map[string]*model.User
	posts             []*model.Post
	reactions         []*model.Reaction
	acknowledgements  []*model.PostAcknowledgement
	statuses          []*model.Status
	attachments       []attachment
	mentionTransforms map[string]string
	membershipChanges          []*model.MembershipChangeMsg
	resultNextMembershipCursor int64
	resultRepeat                bool
	resultNextCursor            model.GetPostsSinceForSyncCursor
	GlobalUserSyncLastTimestamp int64
}
func newSyncData(task syncTask, rc *model.RemoteCluster, scr *model.SharedChannelRemote) *syncData {
	return &syncData{
		task:              task,
		rc:                rc,
		scr:               scr,
		users:             make(map[string]*model.User),
		profileImages:     make(map[string]*model.User),
		mentionTransforms: make(map[string]string),
		resultNextCursor: model.GetPostsSinceForSyncCursor{
			LastPostUpdateAt: scr.LastPostUpdateAt, LastPostUpdateID: scr.LastPostUpdateID,
			LastPostCreateAt: scr.LastPostCreateAt, LastPostCreateID: scr.LastPostCreateID,
		},
	}
}
func (sd *syncData) isEmpty() bool {
	return len(sd.users) == 0 && len(sd.profileImages) == 0 && len(sd.posts) == 0 && len(sd.reactions) == 0 && len(sd.acknowledgements) == 0 && len(sd.attachments) == 0 && len(sd.membershipChanges) == 0
}
func (sd *syncData) isCursorChanged() bool {
	if sd.resultNextCursor.IsEmpty() {
		return false
	}
	return sd.scr.LastPostCreateAt != sd.resultNextCursor.LastPostCreateAt || sd.scr.LastPostCreateID != sd.resultNextCursor.LastPostCreateID ||
		sd.scr.LastPostUpdateAt != sd.resultNextCursor.LastPostUpdateAt || sd.scr.LastPostUpdateID != sd.resultNextCursor.LastPostUpdateID
}
func (sd *syncData) setDataFromMsg(msg *model.SyncMsg) {
	sd.users = msg.Users
	sd.posts = msg.Posts
	sd.reactions = msg.Reactions
	sd.acknowledgements = msg.Acknowledgements
	sd.statuses = msg.Statuses
}
func (scs *Service) syncForRemote(task syncTask, rc *model.RemoteCluster) error {
	if task.channelID == "" {
		return scs.syncAllUsers(rc)
	}
	rcs := scs.server.GetRemoteClusterService()
	if rcs == nil {
		return fmt.Errorf("cannot update remote cluster %s for channel id %s; Remote Cluster Service not enabled", rc.Name, task.channelID)
	}
	metrics := scs.server.GetMetrics()
	start := time.Now()
	var metricsRecorded bool
	defer func() {
		if !metricsRecorded && metrics != nil {
			metrics.IncrementSharedChannelsSyncCounter(rc.RemoteId)
			metrics.ObserveSharedChannelsSyncCollectionDuration(rc.RemoteId, time.Since(start).Seconds())
			metricsRecorded = true
		}
	}()
	scr, err := scs.server.GetStore().SharedChannel().GetRemoteByIds(task.channelID, rc.RemoteId)
	if isNotFoundError(err) && rc.IsOptionFlagSet(model.BitflagOptionAutoInvited) {
		scr = &model.SharedChannelRemote{
			Id:                model.NewId(),
			ChannelId:         task.channelID,
			CreatorId:         rc.CreatorId,
			IsInviteAccepted:  true,
			IsInviteConfirmed: true,
			RemoteId:          rc.RemoteId,
			LastPostCreateAt:  model.GetMillis(),
			LastPostUpdateAt:  model.GetMillis(),
			LastMembersSyncAt: 0,
		}
		if scr, err = scs.server.GetStore().SharedChannel().SaveRemote(scr); err != nil {
			return fmt.Errorf("cannot auto-create shared channel remote (channel_id=%s, remote_id=%s): %w", task.channelID, rc.RemoteId, err)
		}
		scs.server.Log().Log(mlog.LvlSharedChannelServiceDebug, "Auto-invited remote to channel (BitflagOptionAutoInvited)",
			mlog.String("remote", rc.DisplayName),
			mlog.String("channel_id", task.channelID),
		)
	} else if err == nil && scr.DeleteAt != 0 {
		return nil
	} else if err != nil {
		return err
	}
	sd := newSyncData(task, rc, scr)
	if task.retryMsg != nil {
		sd.setDataFromMsg(task.retryMsg)
		return scs.sendSyncData(sd)
	}
	if task.existingMsg != nil {
		sd.setDataFromMsg(task.existingMsg)
		return scs.sendSyncData(sd)
	}
	if task.channelID == "" {
		return fmt.Errorf("task doesn't have prefetched data nor a channel ID set")
	}
	defer func(rpt *bool) {
		if *rpt {
			scs.addTask(newSyncTask(task.channelID, task.userID, task.remoteID, nil, nil))
		}
	}(&sd.resultRepeat)
	if err := scs.fetchPostsForSync(sd); err != nil {
		return fmt.Errorf("cannot fetch posts for sync %v: %w", sd, err)
	}
	if err := scs.fetchMembershipsForSync(sd); err != nil {
		return fmt.Errorf("cannot fetch memberships for sync %v: %w", sd, err)
	}
	if !rc.IsOnline() {
		if len(sd.posts) != 0 {
			scs.notifyRemoteOffline(sd.posts, rc)
		}
		sd.resultRepeat = false
		return nil
	}
	if err := scs.fetchUsersForSync(sd); err != nil {
		return fmt.Errorf("cannot fetch users for sync %v: %w", sd, err)
	}
	if err := scs.fetchReactionsForSync(sd); err != nil {
		return fmt.Errorf("cannot fetch reactions for sync %v: %w", sd, err)
	}
	if err := scs.fetchAcknowledgementsForSync(sd); err != nil {
		return fmt.Errorf("cannot fetch acknowledgements for sync %v: %w", sd, err)
	}
	if err := scs.fetchPostUsersForSync(sd); err != nil {
		return fmt.Errorf("cannot fetch post users for sync %v: %w", sd, err)
	}
	scs.filterPostsForSync(sd)
	if err := scs.fetchPostAttachmentsForSync(sd); err != nil {
		return fmt.Errorf("cannot fetch post attachments for sync %v: %w", sd, err)
	}
	if sd.isEmpty() {
		scs.server.Log().Log(mlog.LvlSharedChannelServiceDebug, "Not sending sync data; everything filtered out",
			mlog.String("remote", rc.DisplayName),
			mlog.String("channel_id", task.channelID),
			mlog.Bool("repeat", sd.resultRepeat),
		)
		if sd.isCursorChanged() {
			scs.updateCursorForRemote(sd.scr.Id, sd.rc, sd.resultNextCursor)
		}
		return nil
	}
	scs.server.Log().Log(mlog.LvlSharedChannelServiceDebug, "Sending sync data",
		mlog.String("remote", rc.DisplayName),
		mlog.String("channel_id", task.channelID),
		mlog.Bool("repeat", sd.resultRepeat),
		mlog.Int("users", len(sd.users)),
		mlog.Int("images", len(sd.profileImages)),
		mlog.Int("posts", len(sd.posts)),
		mlog.Int("reactions", len(sd.reactions)),
		mlog.Int("acknowledgements", len(sd.acknowledgements)),
		mlog.Int("attachments", len(sd.attachments)),
	)
	if !metricsRecorded && metrics != nil {
		metrics.IncrementSharedChannelsSyncCounter(rc.RemoteId)
		metrics.ObserveSharedChannelsSyncCollectionDuration(rc.RemoteId, time.Since(start).Seconds())
		metricsRecorded = true
	}
	return scs.sendSyncData(sd)
}
func (scs *Service) fetchUsersForSync(sd *syncData) error {
	start := time.Now()
	defer func() {
		if metrics := scs.server.GetMetrics(); metrics != nil {
			metrics.ObserveSharedChannelsSyncCollectionStepDuration(sd.rc.RemoteId, "Users", time.Since(start).Seconds())
		}
	}()
	filter := model.GetUsersForSyncFilter{
		ChannelID: sd.task.channelID,
		Limit:     MaxUsersPerSync,
	}
	users, err := scs.server.GetStore().SharedChannel().GetUsersForSync(filter)
	if err != nil {
		return err
	}
	for _, u := range users {
		if u.GetRemoteID() != sd.rc.RemoteId {
			sd.users[u.Id] = u
		}
	}
	filter.CheckProfileImage = true
	usersImage, err := scs.server.GetStore().SharedChannel().GetUsersForSync(filter)
	if err != nil {
		return err
	}
	for _, u := range usersImage {
		if u.GetRemoteID() != sd.rc.RemoteId {
			sd.profileImages[u.Id] = u
		}
	}
	return nil
}
func (scs *Service) fetchPostsForSync(sd *syncData) error {
	start := time.Now()
	defer func() {
		if metrics := scs.server.GetMetrics(); metrics != nil {
			metrics.ObserveSharedChannelsSyncCollectionStepDuration(sd.rc.RemoteId, "Posts", time.Since(start).Seconds())
		}
	}()
	options := model.GetPostsSinceForSyncOptions{
		ChannelId:                         sd.task.channelID,
		IncludeDeleted:                    true,
		SinceCreateAt:                     true,
		ExcludeChannelMetadataSystemPosts: true,
	}
	cursor := model.GetPostsSinceForSyncCursor{
		LastPostUpdateAt: sd.scr.LastPostUpdateAt,
		LastPostUpdateID: sd.scr.LastPostUpdateID,
		LastPostCreateAt: sd.scr.LastPostCreateAt,
		LastPostCreateID: sd.scr.LastPostCreateID,
	}
	maxPostsPerSync := *scs.server.Config().ConnectedWorkspacesSettings.MaxPostsPerSync
	posts, nextCursor, err := scs.server.GetStore().Post().GetPostsSinceForSync(options, cursor, maxPostsPerSync)
	if err != nil {
		return fmt.Errorf("could not fetch new posts for sync: %w", err)
	}
	count := len(posts)
	sd.posts = appendPosts(sd.posts, posts, scs.server.GetStore().Post(), cursor.LastPostCreateAt, scs.server.Log())
	cache := postsSliceToMap(posts)
	if len(posts) < maxPostsPerSync {
		options.SinceCreateAt = false
		posts, nextCursor, err = scs.server.GetStore().Post().GetPostsSinceForSync(options, nextCursor, maxPostsPerSync-len(posts))
		if err != nil {
			return fmt.Errorf("could not fetch modified posts for sync: %w", err)
		}
		posts = reducePostsSliceInCache(posts, cache)
		count += len(posts)
		sd.posts = appendPosts(sd.posts, posts, scs.server.GetStore().Post(), cursor.LastPostUpdateAt, scs.server.Log())
	}
	for i, post := range sd.posts {
		if post != nil {
			sd.posts[i] = scs.app.PreparePostForClient(request.EmptyContext(scs.server.Log()), post, &model.PreparePostForClientOpts{IncludePriority: true})
		}
	}
	sd.resultNextCursor = nextCursor
	sd.resultRepeat = count >= maxPostsPerSync
	return nil
}
func (scs *Service) fetchMembershipsForSync(sd *syncData) error {
	if !scs.server.Config().FeatureFlags.EnableSharedChannelsMemberSync {
		return nil
	}
	start := time.Now()
	defer func() {
		if metrics := scs.server.GetMetrics(); metrics != nil {
			metrics.ObserveSharedChannelsSyncCollectionStepDuration(sd.rc.RemoteId, "Memberships", time.Since(start).Seconds())
		}
	}()
	cursor := sd.scr.LastMembersSyncAt
	limit := scs.GetMemberSyncBatchSize()
	histories, err := scs.server.GetStore().ChannelMemberHistory().GetMembershipChanges(sd.task.channelID, cursor, limit)
	if err != nil {
		return fmt.Errorf("could not fetch membership changes for sync: %w", err)
	}
	if len(histories) == 0 {
		return nil
	}
	type userState struct {
		isAdd     bool
		eventTime int64
	}
	byUser := make(map[string]*userState)
	var maxCursor int64
	for _, h := range histories {
		if h.JoinTime > maxCursor {
			maxCursor = h.JoinTime
		}
		if h.LeaveTime != nil && *h.LeaveTime > maxCursor {
			maxCursor = *h.LeaveTime
		}
		var eventTime int64
		var isAdd bool
		if h.LeaveTime == nil || h.JoinTime > *h.LeaveTime {
			isAdd = true
			eventTime = h.JoinTime
		} else {
			isAdd = false
			eventTime = *h.LeaveTime
		}
		if existing, ok := byUser[h.UserId]; !ok || eventTime > existing.eventTime {
			byUser[h.UserId] = &userState{isAdd: isAdd, eventTime: eventTime}
		}
	}
	for userID, state := range byUser {
		if state.isAdd {
			user, userErr := scs.server.GetStore().User().Get(context.Background(), userID)
			if userErr != nil {
				scs.server.Log().Log(mlog.LvlSharedChannelServiceWarn, "Failed to get user for membership sync",
					mlog.String("user_id", userID),
					mlog.String("channel_id", sd.task.channelID),
					mlog.Err(userErr),
				)
				continue
			}
			sd.membershipChanges = append(sd.membershipChanges, &model.MembershipChangeMsg{
				ChannelId:  sd.task.channelID,
				UserId:     userID,
				IsAdd:      true,
				ChangeTime: state.eventTime,
			})
			doSync, _, syncErr := scs.shouldUserSync(user, sd.task.channelID, sd.rc)
			if syncErr == nil && doSync {
				sd.users[user.Id] = user
			}
		} else {
			sd.membershipChanges = append(sd.membershipChanges, &model.MembershipChangeMsg{
				ChannelId:  sd.task.channelID,
				UserId:     userID,
				IsAdd:      false,
				ChangeTime: state.eventTime,
			})
		}
	}
	sd.resultNextMembershipCursor = maxCursor
	if len(histories) >= limit {
		sd.resultRepeat = true
	}
	return nil
}
func (scs *Service) sendMembershipSyncData(sd *syncData) error {
	start := time.Now()
	defer func() {
		if metrics := scs.server.GetMetrics(); metrics != nil {
			metrics.ObserveSharedChannelsSyncSendStepDuration(sd.rc.RemoteId, "Memberships", time.Since(start).Seconds())
		}
	}()
	msg := model.NewSyncMsg(sd.task.channelID)
	msg.MembershipChanges = sd.membershipChanges
	memberUsers := make(map[string]*model.User)
	for _, mc := range sd.membershipChanges {
		if mc.IsAdd {
			if u, ok := sd.users[mc.UserId]; ok {
				memberUsers[mc.UserId] = u
			}
		}
	}
	msg.Users = memberUsers
	return scs.sendSyncMsgToRemote(msg, sd.rc, func(syncResp model.SyncResponse, errResp error) {
		if len(syncResp.MembershipErrors) != 0 {
			scs.server.Log().Log(mlog.LvlSharedChannelServiceError, "Response indicates error for membership(s) sync",
				mlog.String("channel_id", sd.task.channelID),
				mlog.String("remote_id", sd.rc.RemoteId),
				mlog.Array("membership_errors", syncResp.MembershipErrors),
			)
		}
		if errResp == nil && sd.resultNextMembershipCursor > 0 {
			if err := scs.updateMembershipSyncCursor(sd.task.channelID, sd.rc.RemoteId, sd.resultNextMembershipCursor); err != nil {
				scs.server.Log().Log(mlog.LvlSharedChannelServiceError, "Failed to update membership sync cursor",
					mlog.String("channel_id", sd.task.channelID),
					mlog.String("remote_id", sd.rc.RemoteId),
					mlog.Err(err),
				)
			}
		}
	})
}
func appendPosts(dest []*model.Post, posts []*model.Post, postStore store.PostStore, timestamp int64, logger mlog.LoggerIFace) []*model.Post {
	for _, p := range posts {
		if p.RootId != "" {
			root, err := postStore.GetSingle(request.EmptyContext(logger), p.RootId, true)
			if err == nil {
				if (root.CreateAt >= timestamp || root.UpdateAt >= timestamp) && !containsPost(dest, root) {
					dest = append(dest, root)
				}
			}
		}
		dest = append(dest, p)
	}
	return dest
}
func containsPost(posts []*model.Post, post *model.Post) bool {
	for _, p := range posts {
		if p.Id == post.Id {
			return true
		}
	}
	return false
}
func (scs *Service) fetchReactionsForSync(sd *syncData) error {
	start := time.Now()
	defer func() {
		if metrics := scs.server.GetMetrics(); metrics != nil {
			metrics.ObserveSharedChannelsSyncCollectionStepDuration(sd.rc.RemoteId, "Reactions", time.Since(start).Seconds())
		}
	}()
	merr := merror.New()
	for _, post := range sd.posts {
		reactions, err := scs.server.GetStore().Reaction().GetForPostSince(post.Id, sd.scr.LastPostUpdateAt, sd.rc.RemoteId, true)
		if err != nil {
			merr.Append(fmt.Errorf("could not get reactions for post %s: %w", post.Id, err))
			continue
		}
		sd.reactions = append(sd.reactions, reactions...)
	}
	return merr.ErrorOrNil()
}
func (scs *Service) fetchAcknowledgementsForSync(sd *syncData) error {
	start := time.Now()
	defer func() {
		if metrics := scs.server.GetMetrics(); metrics != nil {
			metrics.ObserveSharedChannelsSyncCollectionStepDuration(sd.rc.RemoteId, "Acknowledgements", time.Since(start).Seconds())
		}
	}()
	merr := merror.New()
	for _, post := range sd.posts {
		acknowledgements, err := scs.server.GetStore().PostAcknowledgement().GetForPostSince(post.Id, sd.scr.LastPostUpdateAt, sd.rc.RemoteId, true)
		if err != nil {
			merr.Append(fmt.Errorf("could not get acknowledgements for post %s: %w", post.Id, err))
			continue
		}
		sd.acknowledgements = append(sd.acknowledgements, acknowledgements...)
	}
	return merr.ErrorOrNil()
}
func (scs *Service) fetchPostUsersForSync(sd *syncData) error {
	start := time.Now()
	defer func() {
		if metrics := scs.server.GetMetrics(); metrics != nil {
			metrics.ObserveSharedChannelsSyncCollectionStepDuration(sd.rc.RemoteId, "PostUsers", time.Since(start).Seconds())
		}
	}()
	sc, err := scs.server.GetStore().SharedChannel().Get(sd.task.channelID)
	if err != nil {
		return fmt.Errorf("cannot determine teamID: %w", err)
	}
	type p2mm struct {
		post       *model.Post
		mentionMap model.UserMentionMap
	}
	userIDs := make(map[string]p2mm)
	for _, reaction := range sd.reactions {
		userIDs[reaction.UserId] = p2mm{}
	}
	for _, acknowledgement := range sd.acknowledgements {
		userIDs[acknowledgement.UserId] = p2mm{}
	}
	for _, post := range sd.posts {
		mentionMap := scs.app.MentionsToTeamMembers(request.EmptyContext(scs.server.Log()), post.Message, sc.TeamId)
		for mention, userID := range mentionMap {
			user, err := scs.server.GetStore().User().Get(context.Background(), userID)
			if err != nil {
				continue
			}
			if user.IsRemote() && !strings.Contains(mention, ":") {
				continue
			}
		}
		userIDs[post.UserId] = p2mm{
			post:       post,
			mentionMap: mentionMap,
		}
		for _, userID := range mentionMap {
			userIDs[userID] = p2mm{
				post:       post,
				mentionMap: mentionMap,
			}
		}
	}
	merr := merror.New()
	for userID, v := range userIDs {
		user, err := scs.server.GetStore().User().Get(context.Background(), userID)
		if err != nil {
			merr.Append(fmt.Errorf("could not get user %s: %w", userID, err))
			continue
		}
		sync, syncImage, err2 := scs.shouldUserSync(user, sd.task.channelID, sd.rc)
		if err2 != nil {
			merr.Append(fmt.Errorf("could not check should sync user %s: %w", userID, err2))
			continue
		}
		if sync {
			sd.users[user.Id] = user
		}
		if syncImage {
			sd.profileImages[user.Id] = user
		}
		if v.mentionMap != nil {
			for mention, mentionUserID := range v.mentionMap {
				if mentionUserID == userID {
					sd.mentionTransforms[mention] = userID
				}
			}
		}
	}
	return merr.ErrorOrNil()
}
func (scs *Service) fetchPostAttachmentsForSync(sd *syncData) error {
	start := time.Now()
	defer func() {
		if metrics := scs.server.GetMetrics(); metrics != nil {
			metrics.ObserveSharedChannelsSyncCollectionStepDuration(sd.rc.RemoteId, "Attachments", time.Since(start).Seconds())
		}
	}()
	merr := merror.New()
	for _, post := range sd.posts {
		fis, err := scs.server.GetStore().FileInfo().GetForPost(post.Id, false, true, true)
		if err != nil {
			merr.Append(fmt.Errorf("could not get file attachment info for post %s: %w", post.Id, err))
			continue
		}
		for _, fi := range fis {
			if scs.shouldSyncAttachment(fi, sd.rc) {
				sd.attachments = append(sd.attachments, attachment{fi: fi, post: post})
			}
		}
	}
	return merr.ErrorOrNil()
}
func (scs *Service) filterPostsForSync(sd *syncData) {
	filtered := make([]*model.Post, 0, len(sd.posts))
	for _, p := range sd.posts {
		hasMetadataChanges := p.Metadata != nil && (p.Metadata.Acknowledgements != nil || p.Metadata.Priority != nil)
		if p.EditAt > 0 && p.EditAt < sd.scr.LastPostUpdateAt && p.DeleteAt == 0 && !hasMetadataChanges {
			continue
		}
		if p.DeleteAt > 0 && p.OriginalId != "" {
			continue
		}
		if p.GetRemoteID() == sd.rc.RemoteId {
			continue
		}
		p.Message = scs.processPermalinkToRemote(p)
		filtered = append(filtered, p)
	}
	sd.posts = filtered
}
func (scs *Service) sendSyncData(sd *syncData) error {
	start := time.Now()
	defer func() {
		if metrics := scs.server.GetMetrics(); metrics != nil {
			metrics.ObserveSharedChannelsSyncSendDuration(sd.rc.RemoteId, time.Since(start).Seconds())
		}
	}()
	merr := merror.New()
	sanitizeSyncData(sd)
	if len(sd.users) != 0 {
		if err := scs.sendUserSyncData(sd); err != nil {
			merr.Append(fmt.Errorf("cannot send user sync data: %w", err))
		}
	}
	if len(sd.membershipChanges) != 0 {
		if err := scs.sendMembershipSyncData(sd); err != nil {
			merr.Append(fmt.Errorf("cannot send membership sync data: %w", err))
		}
	}
	if len(sd.attachments) != 0 {
		scs.sendAttachmentSyncData(sd)
	}
	if len(sd.posts) != 0 {
		if err := scs.sendPostSyncData(sd); err != nil {
			merr.Append(fmt.Errorf("cannot send post sync data: %w", err))
		}
	} else if sd.isCursorChanged() {
		scs.updateCursorForRemote(sd.scr.Id, sd.rc, sd.resultNextCursor)
	}
	if len(sd.acknowledgements) != 0 {
		if err := scs.sendAcknowledgementSyncData(sd); err != nil {
			merr.Append(fmt.Errorf("cannot send acknowledgement sync data: %w", err))
		}
	}
	if len(sd.reactions) != 0 {
		if err := scs.sendReactionSyncData(sd); err != nil {
			merr.Append(fmt.Errorf("cannot send reaction sync data: %w", err))
		}
	}
	if len(sd.statuses) != 0 {
		if err := scs.sendStatusSyncData(sd); err != nil {
			merr.Append(fmt.Errorf("cannot send status sync data: %w", err))
		}
	}
	if len(sd.profileImages) != 0 {
		scs.sendProfileImageSyncData(sd)
	}
	return merr.ErrorOrNil()
}
func (scs *Service) sendUserSyncData(sd *syncData) error {
	start := time.Now()
	defer func() {
		if metrics := scs.server.GetMetrics(); metrics != nil {
			metrics.ObserveSharedChannelsSyncSendStepDuration(sd.rc.RemoteId, "Users", time.Since(start).Seconds())
		}
	}()
	msg := model.NewSyncMsg(sd.task.channelID)
	msg.Users = sd.users
	err := scs.sendSyncMsgToRemote(msg, sd.rc, func(syncResp model.SyncResponse, errResp error) {
		if errResp == nil && sd.GlobalUserSyncLastTimestamp > 0 {
			scs.updateGlobalSyncCursor(sd.rc, sd.GlobalUserSyncLastTimestamp)
		}
		for _, userID := range syncResp.UsersSyncd {
			if err := scs.server.GetStore().SharedChannel().UpdateUserLastSyncAt(userID, sd.task.channelID, sd.rc.RemoteId); err != nil {
				scs.server.Log().Log(mlog.LvlSharedChannelServiceError, "Cannot update shared channel user LastSyncAt",
					mlog.String("user_id", userID),
					mlog.String("channel_id", sd.task.channelID),
					mlog.String("remote_id", sd.rc.RemoteId),
					mlog.Err(err),
				)
			}
		}
		if len(syncResp.UserErrors) != 0 {
			scs.server.Log().Log(mlog.LvlSharedChannelServiceError, "Response indicates error for user(s) sync",
				mlog.String("channel_id", sd.task.channelID),
				mlog.String("remote_id", sd.rc.RemoteId),
				mlog.Array("users", syncResp.UserErrors),
			)
		}
	})
	return err
}
func (scs *Service) sendAttachmentSyncData(sd *syncData) {
	for _, a := range sd.attachments {
		if err := scs.sendAttachmentForRemote(a.fi, a.post, sd.rc); err != nil {
			scs.server.Log().Log(mlog.LvlSharedChannelServiceError, "Cannot sync post attachment",
				mlog.String("post_id", a.post.Id),
				mlog.String("channel_id", sd.task.channelID),
				mlog.String("remote_id", sd.rc.RemoteId),
				mlog.Err(err),
			)
		}
	}
}
func (scs *Service) sendPostSyncData(sd *syncData) error {
	start := time.Now()
	defer func() {
		if metrics := scs.server.GetMetrics(); metrics != nil {
			metrics.ObserveSharedChannelsSyncSendStepDuration(sd.rc.RemoteId, "Posts", time.Since(start).Seconds())
		}
	}()
	msg := model.NewSyncMsg(sd.task.channelID)
	msg.Posts = sd.posts
	msg.MentionTransforms = sd.mentionTransforms
	return scs.sendSyncMsgToRemote(msg, sd.rc, func(syncResp model.SyncResponse, errResp error) {
		if len(syncResp.PostErrors) != 0 {
			scs.server.Log().Log(mlog.LvlSharedChannelServiceError, "Response indicates error for post(s) sync",
				mlog.String("channel_id", sd.task.channelID),
				mlog.String("remote_id", sd.rc.RemoteId),
				mlog.Array("posts", syncResp.PostErrors),
			)
			for _, postID := range syncResp.PostErrors {
				scs.handlePostError(postID, sd.task, sd.rc)
			}
		}
		scs.updateCursorForRemote(sd.scr.Id, sd.rc, sd.resultNextCursor)
	})
}
func (scs *Service) sendReactionSyncData(sd *syncData) error {
	start := time.Now()
	defer func() {
		if metrics := scs.server.GetMetrics(); metrics != nil {
			metrics.ObserveSharedChannelsSyncSendStepDuration(sd.rc.RemoteId, "Reactions", time.Since(start).Seconds())
		}
	}()
	msg := model.NewSyncMsg(sd.task.channelID)
	msg.Reactions = sd.reactions
	return scs.sendSyncMsgToRemote(msg, sd.rc, func(syncResp model.SyncResponse, errResp error) {
		if len(syncResp.ReactionErrors) != 0 {
			scs.server.Log().Log(mlog.LvlSharedChannelServiceError, "Response indicates error for reactions(s) sync",
				mlog.String("channel_id", sd.task.channelID),
				mlog.String("remote_id", sd.rc.RemoteId),
				mlog.Array("reaction_posts", syncResp.ReactionErrors),
			)
		}
	})
}
func (scs *Service) sendAcknowledgementSyncData(sd *syncData) error {
	start := time.Now()
	defer func() {
		if metrics := scs.server.GetMetrics(); metrics != nil {
			metrics.ObserveSharedChannelsSyncSendStepDuration(sd.rc.RemoteId, "Acknowledgements", time.Since(start).Seconds())
		}
	}()
	msg := model.NewSyncMsg(sd.task.channelID)
	msg.Acknowledgements = sd.acknowledgements
	return scs.sendSyncMsgToRemote(msg, sd.rc, func(syncResp model.SyncResponse, errResp error) {
		if len(syncResp.AcknowledgementErrors) != 0 {
			scs.server.Log().Log(mlog.LvlSharedChannelServiceError, "Response indicates error for acknowledgement(s) sync",
				mlog.String("channel_id", sd.task.channelID),
				mlog.String("remote_id", sd.rc.RemoteId),
				mlog.Array("acknowledgement_posts", syncResp.AcknowledgementErrors),
			)
		}
	})
}
func (scs *Service) sendStatusSyncData(sd *syncData) error {
	msg := model.NewSyncMsg(sd.task.channelID)
	msg.Statuses = sd.statuses
	return scs.sendSyncMsgToRemote(msg, sd.rc, func(syncResp model.SyncResponse, errResp error) {
		if len(syncResp.StatusErrors) != 0 {
			scs.server.Log().Log(mlog.LvlSharedChannelServiceError, "Response indicates error from status(es) sync",
				mlog.String("remote_id", sd.rc.RemoteId),
				mlog.Array("user_ids", syncResp.StatusErrors),
			)
			for _, userID := range syncResp.StatusErrors {
				scs.handleStatusError(userID, sd.task, sd.rc)
			}
		}
	})
}
func (scs *Service) sendProfileImageSyncData(sd *syncData) {
	for _, user := range sd.profileImages {
		scs.syncProfileImage(user, sd.task.channelID, sd.rc)
	}
}
func (scs *Service) shouldUserSyncGlobal(user *model.User, rc *model.RemoteCluster) (bool, error) {
	if user.IsRemote() && user.GetRemoteID() == rc.RemoteId {
		return false, nil
	}
	latestUserUpdateTime := max(user.LastPictureUpdate, user.UpdateAt)
	if rc.LastGlobalUserSyncAt == 0 {
		return true, nil
	}
	return latestUserUpdateTime > rc.LastGlobalUserSyncAt, nil
}
func (scs *Service) syncAllUsers(rc *model.RemoteCluster) error {
	if !scs.server.Config().FeatureFlags.EnableSyncAllUsersForRemoteCluster {
		return nil
	}
	if !rc.IsOnline() {
		return fmt.Errorf("remote cluster %s is not online", rc.RemoteId)
	}
	metrics := scs.server.GetMetrics()
	start := time.Now()
	defer func() {
		if metrics != nil {
			metrics.IncrementSharedChannelsSyncCounter(rc.RemoteId)
			metrics.ObserveSharedChannelsSyncCollectionDuration(rc.RemoteId, time.Since(start).Seconds())
		}
	}()
	batchSize := scs.getGlobalUserSyncBatchSize()
	sd := &syncData{
		task:  syncTask{remoteID: rc.RemoteId},
		rc:    rc,
		scr:   &model.SharedChannelRemote{RemoteId: rc.RemoteId},
		users: make(map[string]*model.User),
	}
	users, latestTimestamp, _, hasMore, err := scs.collectUsersForGlobalSync(rc, batchSize)
	if err != nil {
		return err
	}
	if len(users) == 0 {
		scs.server.Log().Log(mlog.LvlSharedChannelServiceDebug, "No users to sync for remote cluster",
			mlog.String("remote_id", rc.RemoteId))
		return nil
	}
	sd.users = users
	sd.GlobalUserSyncLastTimestamp = latestTimestamp
	if err := scs.sendUserSyncData(sd); err != nil {
		scs.server.Log().Log(mlog.LvlSharedChannelServiceError, "Error sending user batch during sync",
			mlog.String("remote_id", rc.RemoteId),
			mlog.Err(err),
		)
		return fmt.Errorf("error sending user batch during sync: %w", err)
	}
	if hasMore {
		scs.scheduleNextUserSyncBatch(rc, latestTimestamp, batchSize, len(users))
	}
	return nil
}
func (scs *Service) getGlobalUserSyncBatchSize() int {
	batchSize := MaxUsersPerSync
	if scs.server.Config().ConnectedWorkspacesSettings.GlobalUserSyncBatchSize != nil {
		configValue := *scs.server.Config().ConnectedWorkspacesSettings.GlobalUserSyncBatchSize
		if configValue > 0 && configValue <= 200 {
			batchSize = configValue
		}
	}
	return batchSize
}
func (scs *Service) collectUsersForGlobalSync(rc *model.RemoteCluster, batchSize int) (map[string]*model.User, int64, int, bool, error) {
	options := &model.UserGetOptions{
		Page:    0,
		PerPage: 100,
		Active:  true,
		Sort:    "update_at_asc",
	}
	if rc.LastGlobalUserSyncAt > 0 {
		options.UpdatedAfter = rc.LastGlobalUserSyncAt
	}
	users := make(map[string]*model.User)
	latestTimestamp := rc.LastGlobalUserSyncAt
	totalCount := 0
	for {
		batch, err := scs.server.GetStore().User().GetAllProfiles(options)
		if err != nil {
			scs.server.Log().Log(mlog.LvlSharedChannelServiceError, "Error fetching users for global sync",
				mlog.String("remote_id", rc.RemoteId),
				mlog.Err(err),
			)
			return nil, 0, 0, false, err
		}
		if len(batch) == 0 {
			break
		}
		totalCount += len(batch)
		for _, user := range batch {
			if len(users) >= batchSize {
				return users, latestTimestamp, totalCount, true, nil
			}
			if user.IsRemote() {
				continue
			}
			needsSync, _ := scs.shouldUserSyncGlobal(user, rc)
			if !needsSync {
				continue
			}
			users[user.Id] = user
			userUpdateTime := max(user.UpdateAt, user.LastPictureUpdate)
			if userUpdateTime > latestTimestamp {
				latestTimestamp = userUpdateTime
			}
		}
		if len(batch) < options.PerPage {
			break
		}
		options.Page++
	}
	return users, latestTimestamp, totalCount, false, nil
}
func (scs *Service) updateGlobalSyncCursor(rc *model.RemoteCluster, newTimestamp int64) {
	if err := scs.server.GetStore().RemoteCluster().UpdateLastGlobalUserSyncAt(rc.RemoteId, newTimestamp); err == nil {
		rc.LastGlobalUserSyncAt = newTimestamp
	} else {
		scs.server.Log().Log(mlog.LvlSharedChannelServiceError, "Failed to update global user sync cursor",
			mlog.String("remote_id", rc.RemoteId),
			mlog.Err(err),
		)
	}
}
func (scs *Service) scheduleNextUserSyncBatch(rc *model.RemoteCluster, timestamp int64, batchSize, processedCount int) {
	timestampStr := fmt.Sprintf("%d", timestamp)
	task := newSyncTask("", timestampStr, rc.RemoteId, nil, nil)
	task.schedule = time.Now().Add(NotifyMinimumDelay)
	scs.addTask(task)
}
func (scs *Service) sendSyncMsgToRemote(msg *model.SyncMsg, rc *model.RemoteCluster, f sendSyncMsgResultFunc) error {
	rcs := scs.server.GetRemoteClusterService()
	if rcs == nil {
		return fmt.Errorf("cannot update remote cluster %s for channel id %s; Remote Cluster Service not enabled", rc.Name, msg.ChannelId)
	}
	if rc.IsPlugin() {
		return scs.sendSyncMsgToPlugin(msg, rc, f)
	}
	b, err := json.Marshal(msg)
	if err != nil {
		return err
	}
	topic := TopicSync
	if msg.ChannelId == "" && len(msg.Users) > 0 &&
		len(msg.Posts) == 0 && len(msg.Reactions) == 0 &&
		len(msg.Statuses) == 0 {
		topic = TopicGlobalUserSync
	}
	rcMsg := model.NewRemoteClusterMsg(topic, b)
	ctx, cancel := context.WithTimeout(context.Background(), remotecluster.SendTimeout)
	defer cancel()
	var wg sync.WaitGroup
	wg.Add(1)
	err = rcs.SendMsg(ctx, rcMsg, rc, func(rcMsg model.RemoteClusterMsg, rc *model.RemoteCluster, rcResp *remotecluster.Response, errResp error) {
		defer wg.Done()
		if rcResp != nil && !rcResp.IsSuccess() && strings.Contains(rcResp.Err, ErrChannelNotShared.Error()) {
			scs.handleChannelNotSharedError(msg, rc)
			return
		}
		var syncResp model.SyncResponse
		if errResp == nil {
			if rcResp != nil && len(rcResp.Payload) > 0 {
				if err2 := json.Unmarshal(rcResp.Payload, &syncResp); err2 != nil {
					scs.server.Log().Log(mlog.LvlSharedChannelServiceError, "Invalid sync msg response from remote cluster",
						mlog.String("remote", rc.Name),
						mlog.String("channel_id", msg.ChannelId),
						mlog.Err(err2),
					)
					return
				}
				if f != nil {
					f(syncResp, errResp)
				}
			} else {
				scs.server.Log().Log(mlog.LvlSharedChannelServiceError, "Empty or nil response payload from remote cluster",
					mlog.String("remote", rc.Name),
					mlog.String("channel_id", msg.ChannelId),
				)
			}
		}
	})
	wg.Wait()
	return err
}
func (scs *Service) sendSyncMsgToPlugin(msg *model.SyncMsg, rc *model.RemoteCluster, f sendSyncMsgResultFunc) error {
	syncResp, errResp := scs.app.OnSharedChannelsSyncMsg(msg, rc)
	if f != nil {
		f(syncResp, errResp)
	}
	return errResp
}
func sanitizeSyncData(sd *syncData) {
	for id, user := range sd.users {
		sd.users[id] = sanitizeUserForSync(user)
	}
	for id, user := range sd.profileImages {
		sd.profileImages[id] = sanitizeUserForSync(user)
	}
}
func (scs *Service) handleChannelNotSharedError(msg *model.SyncMsg, rc *model.RemoteCluster) {
	logger := scs.server.Log()
	logger.Log(mlog.LvlSharedChannelServiceDebug, "Remote indicated channel is no longer shared; unsharing locally",
		mlog.String("remote", rc.Name),
		mlog.String("channel_id", msg.ChannelId),
	)
	scr, getErr := scs.server.GetStore().SharedChannel().GetRemoteByIds(msg.ChannelId, rc.RemoteId)
	if getErr != nil {
		logger.Log(mlog.LvlSharedChannelServiceError, "Failed to get shared channel remote",
			mlog.String("remote", rc.Name),
			mlog.String("channel_id", msg.ChannelId),
			mlog.Err(getErr),
		)
		return
	}
	channel, channelErr := scs.server.GetStore().Channel().Get(msg.ChannelId, true)
	if channelErr != nil {
		logger.Log(mlog.LvlSharedChannelServiceError, "Failed to get channel details",
			mlog.String("remote", rc.Name),
			mlog.String("channel_id", msg.ChannelId),
			mlog.Err(channelErr),
		)
		return
	}
	scs.postUnshareNotification(msg.ChannelId, scr.CreatorId, channel, rc)
	if err := scs.UninviteRemoteFromChannel(msg.ChannelId, rc.RemoteId); err != nil {
		logger.Log(mlog.LvlSharedChannelServiceError, "Failed to uninvite remote from shared channel", mlog.Err(err))
		return
	}
}