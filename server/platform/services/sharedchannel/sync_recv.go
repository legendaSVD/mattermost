package sharedchannel
import (
	"context"
	"encoding/json"
	"errors"
	"fmt"
	"strconv"
	"strings"
	"github.com/mattermost/mattermost/server/public/model"
	"github.com/mattermost/mattermost/server/public/shared/mlog"
	"github.com/mattermost/mattermost/server/public/shared/request"
	"github.com/mattermost/mattermost/server/v8/platform/services/remotecluster"
)
var (
	ErrRemoteIDMismatch  = errors.New("remoteID mismatch")
	ErrChannelIDMismatch = errors.New("channelID mismatch")
	ErrUserDMPermission  = errors.New("users cannot DM each other")
	ErrChannelNotShared  = errors.New("channel is no longer shared")
)
func (scs *Service) onReceiveSyncMessage(msg model.RemoteClusterMsg, rc *model.RemoteCluster, response *remotecluster.Response) error {
	if msg.Topic != TopicSync && msg.Topic != TopicChannelMembership && msg.Topic != TopicGlobalUserSync {
		return fmt.Errorf("wrong topic, expected sync-related topic, got `%s`", msg.Topic)
	}
	if len(msg.Payload) == 0 {
		return errors.New("empty sync message")
	}
	if scs.server.Log().IsLevelEnabled(mlog.LvlSharedChannelServiceMessagesInbound) {
		scs.server.Log().Log(mlog.LvlSharedChannelServiceMessagesInbound, "inbound message",
			mlog.String("remote", rc.DisplayName),
			mlog.String("msg", msg.Payload),
		)
	}
	var sm model.SyncMsg
	if err := json.Unmarshal(msg.Payload, &sm); err != nil {
		return fmt.Errorf("invalid sync message: %w", err)
	}
	return scs.processSyncMessage(request.EmptyContext(scs.server.Log()), &sm, rc, response)
}
func (scs *Service) processGlobalUserSync(rctx request.CTX, syncMsg *model.SyncMsg, rc *model.RemoteCluster, response *remotecluster.Response) error {
	syncResp := model.SyncResponse{
		UserErrors: make([]string, 0),
		UsersSyncd: make([]string, 0),
	}
	scs.server.Log().Log(mlog.LvlSharedChannelServiceDebug, "Processing global user sync",
		mlog.String("remote", rc.Name),
		mlog.Int("user_count", len(syncMsg.Users)),
	)
	for _, user := range syncMsg.Users {
		if userSaved, err := scs.upsertSyncUser(rctx, user, nil, rc); err != nil {
			syncResp.UserErrors = append(syncResp.UserErrors, user.Id)
		} else {
			syncResp.UsersSyncd = append(syncResp.UsersSyncd, userSaved.Id)
			if syncResp.UsersLastUpdateAt < user.UpdateAt {
				syncResp.UsersLastUpdateAt = user.UpdateAt
			}
			scs.server.Log().Log(mlog.LvlSharedChannelServiceDebug, "Global user upserted via sync",
				mlog.String("remote", rc.Name),
				mlog.String("user_id", user.Id),
			)
		}
	}
	return response.SetPayload(syncResp)
}
func (scs *Service) processSyncMessage(rctx request.CTX, syncMsg *model.SyncMsg, rc *model.RemoteCluster, response *remotecluster.Response) error {
	var targetChannel *model.Channel
	var team *model.Team
	var err error
	syncResp := model.SyncResponse{
		UserErrors:            make([]string, 0),
		UsersSyncd:            make([]string, 0),
		PostErrors:            make([]string, 0),
		ReactionErrors:        make([]string, 0),
		AcknowledgementErrors: make([]string, 0),
		MembershipErrors:      make([]string, 0),
	}
	membershipSyncEnabled := scs.server.Config().FeatureFlags.EnableSharedChannelsMemberSync
	hasMembershipChanges := len(syncMsg.MembershipChanges) > 0
	if hasMembershipChanges && !membershipSyncEnabled && len(syncMsg.Users) == 0 && len(syncMsg.Posts) == 0 && len(syncMsg.Reactions) == 0 {
		return nil
	}
	scs.server.Log().Log(mlog.LvlSharedChannelServiceDebug, "Sync msg received",
		mlog.String("remote", rc.Name),
		mlog.String("channel_id", syncMsg.ChannelId),
		mlog.Int("user_count", len(syncMsg.Users)),
		mlog.Int("post_count", len(syncMsg.Posts)),
		mlog.Int("reaction_count", len(syncMsg.Reactions)),
		mlog.Int("acknowledgement_count", len(syncMsg.Acknowledgements)),
		mlog.Int("status_count", len(syncMsg.Statuses)),
		mlog.Int("membership_change_count", len(syncMsg.MembershipChanges)),
	)
	if syncMsg.ChannelId == "" {
		if len(syncMsg.Posts) != 0 ||
			len(syncMsg.Reactions) != 0 ||
			len(syncMsg.Statuses) != 0 {
			return fmt.Errorf("global user sync message should not contain posts, reactions or statuses")
		}
		if len(syncMsg.Users) == 0 {
			return nil
		}
		if !scs.isGlobalUserSyncEnabled() {
			return nil
		}
		return scs.processGlobalUserSync(rctx, syncMsg, rc, response)
	}
	if targetChannel, err = scs.server.GetStore().Channel().Get(syncMsg.ChannelId, true); err != nil {
		return fmt.Errorf("channel not found processing sync message: %w", err)
	}
	exists, err := scs.server.GetStore().SharedChannel().HasRemote(targetChannel.Id, rc.RemoteId)
	if err != nil {
		return fmt.Errorf("cannot check channel share state for sync message: %w", err)
	}
	if !exists {
		return fmt.Errorf("cannot process sync message; %w: %s",
			ErrChannelNotShared, syncMsg.ChannelId)
	}
	for _, user := range syncMsg.Users {
		if userSaved, err := scs.upsertSyncUser(rctx, user, targetChannel, rc); err != nil {
			scs.server.Log().Log(mlog.LvlSharedChannelServiceError, "Error upserting sync user",
				mlog.String("remote", rc.Name),
				mlog.String("channel_id", syncMsg.ChannelId),
				mlog.String("user_id", user.Id),
				mlog.Err(err))
		} else {
			syncResp.UsersSyncd = append(syncResp.UsersSyncd, userSaved.Id)
			if syncResp.UsersLastUpdateAt < user.UpdateAt {
				syncResp.UsersLastUpdateAt = user.UpdateAt
			}
			scs.server.Log().Log(mlog.LvlSharedChannelServiceDebug, "User upserted via sync",
				mlog.String("remote", rc.Name),
				mlog.String("channel_id", syncMsg.ChannelId),
				mlog.String("user_id", user.Id),
			)
		}
	}
	for _, post := range syncMsg.Posts {
		if syncMsg.ChannelId != post.ChannelId {
			scs.server.Log().Log(mlog.LvlSharedChannelServiceError, "ChannelId mismatch",
				mlog.String("remote", rc.Name),
				mlog.String("sm.ChannelId", syncMsg.ChannelId),
				mlog.String("sm.Post.ChannelId", post.ChannelId),
				mlog.String("PostId", post.Id),
			)
			syncResp.PostErrors = append(syncResp.PostErrors, post.Id)
			continue
		}
		if (targetChannel.Type != model.ChannelTypeDirect && targetChannel.Type != model.ChannelTypeGroup) && team == nil {
			var err2 error
			team, err2 = scs.server.GetStore().Channel().GetTeamForChannel(syncMsg.ChannelId)
			if err2 != nil {
				scs.server.Log().Log(mlog.LvlSharedChannelServiceError, "Error getting Team for Channel",
					mlog.String("ChannelId", post.ChannelId),
					mlog.String("PostId", post.Id),
					mlog.String("remote", rc.Name),
					mlog.Err(err2),
				)
				syncResp.PostErrors = append(syncResp.PostErrors, post.Id)
				continue
			}
		}
		if team != nil {
			post.Message = scs.processPermalinkFromRemote(post, team)
		}
		rpost, err := scs.upsertSyncPost(post, targetChannel, rc, syncMsg.MentionTransforms)
		if err != nil {
			syncResp.PostErrors = append(syncResp.PostErrors, post.Id)
			scs.server.Log().Log(mlog.LvlSharedChannelServiceError, "Error upserting sync post",
				mlog.String("post_id", post.Id),
				mlog.String("channel_id", post.ChannelId),
				mlog.String("remote", rc.Name),
				mlog.Err(err),
			)
		} else if syncResp.PostsLastUpdateAt < rpost.UpdateAt {
			syncResp.PostsLastUpdateAt = rpost.UpdateAt
		}
	}
	for _, reaction := range syncMsg.Reactions {
		if _, err := scs.upsertSyncReaction(reaction, targetChannel, rc); err != nil {
			scs.server.Log().Log(mlog.LvlSharedChannelServiceError, "Error upserting sync reaction",
				mlog.String("remote", rc.Name),
				mlog.String("user_id", reaction.UserId),
				mlog.String("post_id", reaction.PostId),
				mlog.String("emoji", reaction.EmojiName),
				mlog.Int("delete_at", reaction.DeleteAt),
				mlog.Err(err),
			)
		} else {
			scs.server.Log().Log(mlog.LvlSharedChannelServiceDebug, "Reaction upserted via sync",
				mlog.String("remote", rc.Name),
				mlog.String("user_id", reaction.UserId),
				mlog.String("post_id", reaction.PostId),
				mlog.String("emoji", reaction.EmojiName),
				mlog.Int("delete_at", reaction.DeleteAt),
			)
			if syncResp.ReactionsLastUpdateAt < reaction.UpdateAt {
				syncResp.ReactionsLastUpdateAt = reaction.UpdateAt
			}
		}
	}
	for _, acknowledgement := range syncMsg.Acknowledgements {
		if _, err := scs.upsertSyncAcknowledgement(acknowledgement, targetChannel, rc); err != nil {
			scs.server.Log().Log(mlog.LvlSharedChannelServiceError, "Error upserting sync acknowledgement",
				mlog.String("remote", rc.Name),
				mlog.String("user_id", acknowledgement.UserId),
				mlog.String("post_id", acknowledgement.PostId),
				mlog.Int("acknowledged_at", acknowledgement.AcknowledgedAt),
				mlog.Err(err),
			)
			syncResp.AcknowledgementErrors = append(syncResp.AcknowledgementErrors, acknowledgement.PostId)
		} else {
			scs.server.Log().Log(mlog.LvlSharedChannelServiceDebug, "Acknowledgement upserted via sync",
				mlog.String("remote", rc.Name),
				mlog.String("user_id", acknowledgement.UserId),
				mlog.String("post_id", acknowledgement.PostId),
				mlog.Int("acknowledged_at", acknowledgement.AcknowledgedAt),
			)
			if syncResp.AcknowledgementsLastUpdateAt < acknowledgement.AcknowledgedAt {
				syncResp.AcknowledgementsLastUpdateAt = acknowledgement.AcknowledgedAt
			}
		}
	}
	for _, status := range syncMsg.Statuses {
		if err := scs.upsertSyncUserStatus(rctx, status, rc); err != nil {
			scs.server.Log().Log(mlog.LvlSharedChannelServiceError, "Error upserting sync user status",
				mlog.String("remote", rc.Name),
				mlog.String("user_id", status.UserId),
				mlog.Err(err))
			syncResp.StatusErrors = append(syncResp.StatusErrors, status.UserId)
		}
	}
	if hasMembershipChanges && membershipSyncEnabled {
		if err := scs.onReceiveMembershipChanges(syncMsg, rc, response); err != nil {
			scs.server.Log().Log(mlog.LvlSharedChannelServiceError, "Error processing membership changes",
				mlog.String("remote", rc.Name),
				mlog.String("channel_id", syncMsg.ChannelId),
				mlog.Int("change_count", len(syncMsg.MembershipChanges)),
				mlog.Err(err),
			)
			syncResp.MembershipErrors = append(syncResp.MembershipErrors, err.Error())
		}
	}
	response.SetPayload(syncResp)
	return nil
}
func (scs *Service) upsertSyncUser(rctx request.CTX, user *model.User, channel *model.Channel, rc *model.RemoteCluster) (*model.User, error) {
	var err error
	euser, err := scs.server.GetStore().User().Get(context.Background(), user.Id)
	if err != nil {
		if _, ok := err.(errNotFound); !ok {
			return nil, fmt.Errorf("error checking sync user: %w", err)
		}
	}
	var userSaved *model.User
	if euser == nil {
		originalRemoteId := user.GetRemoteID()
		user.RemoteId = model.NewPointer(rc.RemoteId)
		if user.Props == nil || user.Props[model.UserPropsKeyOriginalRemoteId] == "" {
			if originalRemoteId == "" {
				originalRemoteId = rc.RemoteId
			}
			user.SetProp(model.UserPropsKeyOriginalRemoteId, originalRemoteId)
		}
		if userSaved, err = scs.insertSyncUser(rctx, user, channel, rc); err != nil {
			return nil, err
		}
	} else {
		if euser.GetRemoteID() != rc.RemoteId {
			scs.server.Log().Log(mlog.LvlSharedChannelServiceError, "RemoteID mismatch sync'ing user",
				mlog.String("remote", rc.Name),
				mlog.String("user_id", user.Id),
				mlog.String("existing_user_remote_id", euser.GetRemoteID()),
				mlog.String("update_user_remote_id", user.GetRemoteID()),
			)
			return nil, fmt.Errorf("error updating user: %w", ErrRemoteIDMismatch)
		}
		user.SetProp(model.UserPropsKeyRemoteUsername, user.Username)
		user.SetProp(model.UserPropsKeyRemoteEmail, user.Email)
		patch := &model.UserPatch{
			Username:  &user.Username,
			Nickname:  &user.Nickname,
			FirstName: &user.FirstName,
			LastName:  &user.LastName,
			Props:     user.Props,
			Position:  &user.Position,
			Locale:    &user.Locale,
			Timezone:  user.Timezone,
		}
		if userSaved, err = scs.updateSyncUser(rctx, patch, euser, channel, rc); err != nil {
			return nil, err
		}
	}
	if channel != nil && channel.TeamId != "" {
		if err := scs.app.AddUserToTeamByTeamId(request.EmptyContext(scs.server.Log()), channel.TeamId, userSaved); err != nil {
			return nil, fmt.Errorf("error adding sync user to Team: %w", err)
		}
		if _, err := scs.app.AddUserToChannel(rctx, userSaved, channel, false); err != nil {
			return nil, fmt.Errorf("error adding sync user to ChannelMembers: %w", err)
		}
	}
	return userSaved, nil
}
func (scs *Service) insertSyncUser(rctx request.CTX, user *model.User, _ *model.Channel, rc *model.RemoteCluster) (*model.User, error) {
	var err error
	var userSaved *model.User
	var suffix string
	user = sanitizeUserForSync(user)
	user.SetProp(model.UserPropsKeyRemoteUsername, user.Username)
	user.SetProp(model.UserPropsKeyRemoteEmail, user.Email)
	for i := 1; i <= MaxUpsertRetries; i++ {
		if i > 1 {
			suffix = strconv.FormatInt(int64(i), 10)
		}
		user.Username = mungUsername(user.Username, rc.Name, suffix, model.UserNameMaxLength)
		user.Email = model.NewId()
		if userSaved, err = scs.server.GetStore().User().Save(rctx, user); err != nil {
			field, ok := isConflictError(err)
			if !ok {
				break
			}
			if field == "email" || field == "username" {
				scs.server.Log().Log(mlog.LvlSharedChannelServiceWarn, "Collision inserting sync user",
					mlog.String("field", field),
					mlog.String("username", user.Username),
					mlog.String("email", user.Email),
					mlog.Int("attempt", i),
					mlog.Err(err),
				)
			}
		} else {
			scs.app.NotifySharedChannelUserUpdate(userSaved)
			return userSaved, nil
		}
	}
	return nil, fmt.Errorf("error inserting sync user %s: %w", user.Id, err)
}
func (scs *Service) updateSyncUser(rctx request.CTX, patch *model.UserPatch, user *model.User, _ *model.Channel, rc *model.RemoteCluster) (*model.User, error) {
	var err error
	var update *model.UserUpdate
	var suffix string
	realUsername, _ := user.GetProp(model.UserPropsKeyRemoteUsername)
	realEmail, _ := user.GetProp(model.UserPropsKeyRemoteEmail)
	if patch.Username != nil && !strings.Contains(*patch.Username, ":") {
		realUsername = *patch.Username
	}
	if patch.Email != nil && !strings.Contains(*patch.Email, ":") {
		realEmail = *patch.Email
	}
	user.Patch(patch)
	user = sanitizeUserForSync(user)
	user.SetProp(model.UserPropsKeyRemoteUsername, realUsername)
	user.SetProp(model.UserPropsKeyRemoteEmail, realEmail)
	for i := 1; i <= MaxUpsertRetries; i++ {
		if i > 1 {
			suffix = strconv.FormatInt(int64(i), 10)
		}
		user.Username = mungUsername(user.Username, rc.Name, suffix, model.UserNameMaxLength)
		user.Email = model.NewId()
		if update, err = scs.server.GetStore().User().Update(rctx, user, false); err != nil {
			field, ok := isConflictError(err)
			if !ok {
				break
			}
			if field == "email" || field == "username" {
				scs.server.Log().Log(mlog.LvlSharedChannelServiceWarn, "Collision updating sync user",
					mlog.String("field", field),
					mlog.String("username", user.Username),
					mlog.String("email", user.Email),
					mlog.Int("attempt", i),
					mlog.Err(err),
				)
			}
		} else {
			scs.platform.InvalidateCacheForUser(update.New.Id)
			scs.app.NotifySharedChannelUserUpdate(update.New)
			return update.New, nil
		}
	}
	return nil, fmt.Errorf("error updating sync user %s: %w", user.Id, err)
}
func (scs *Service) upsertSyncPost(post *model.Post, targetChannel *model.Channel, rc *model.RemoteCluster, mentionTransforms map[string]string) (*model.Post, error) {
	var appErr *model.AppError
	post.RemoteId = model.NewPointer(rc.RemoteId)
	rctx := request.EmptyContext(scs.server.Log())
	rpost, err := scs.server.GetStore().Post().GetSingle(rctx, post.Id, true)
	if err != nil {
		if _, ok := err.(errNotFound); !ok {
			return nil, fmt.Errorf("error checking sync post: %w", err)
		}
	}
	if post.ChannelId != targetChannel.Id || (rpost != nil && rpost.ChannelId != targetChannel.Id) {
		return nil, fmt.Errorf("post sync failed: %w", ErrChannelIDMismatch)
	}
	if rpost == nil {
		user, err := scs.server.GetStore().User().Get(context.TODO(), post.UserId)
		if err != nil {
			return nil, fmt.Errorf("error fetching user for post sync: %w", err)
		}
		if user.GetRemoteID() != rc.RemoteId {
			return nil, fmt.Errorf("post sync failed: %w", ErrRemoteIDMismatch)
		}
		scs.transformMentionsOnReceive(rctx, post, targetChannel, rc, mentionTransforms)
		rpost, _, appErr = scs.app.CreatePost(rctx, post, targetChannel, model.CreatePostFlags{TriggerWebhooks: true, SetOnline: true})
		if appErr == nil {
			scs.server.Log().Log(mlog.LvlSharedChannelServiceDebug, "Created sync post",
				mlog.String("post_id", post.Id),
				mlog.String("channel_id", post.ChannelId),
			)
		}
	} else if post.DeleteAt > 0 {
		rpost, appErr = scs.app.DeletePost(rctx, post.Id, post.UserId)
		if appErr == nil {
			scs.server.Log().Log(mlog.LvlSharedChannelServiceDebug, "Deleted sync post",
				mlog.String("post_id", post.Id),
				mlog.String("channel_id", post.ChannelId),
			)
		}
	} else if post.EditAt > rpost.EditAt || post.Message != rpost.Message || post.UpdateAt > rpost.UpdateAt || post.Metadata != nil {
		scs.transformMentionsOnReceive(rctx, post, targetChannel, rc, mentionTransforms)
		var priority *model.PostPriority
		var acknowledgements []*model.PostAcknowledgement
		if post.Metadata != nil {
			if post.Metadata.Priority != nil {
				priority = post.Metadata.Priority
			}
			if post.Metadata.Acknowledgements != nil {
				acknowledgements = post.Metadata.Acknowledgements
			}
		}
		rpost, _, appErr = scs.app.UpdatePost(rctx, post, nil)
		if appErr != nil {
			rerr := errors.New(appErr.Error())
			return nil, rerr
		}
		if priority != nil {
			rpost = scs.syncRemotePriorityMetadata(rctx, post, priority, rpost)
		}
		if acknowledgements != nil {
			rpost = scs.syncRemoteAcknowledgementsMetadata(rctx, post, acknowledgements, rpost)
		}
	} else {
		scs.server.Log().Log(mlog.LvlSharedChannelServiceDebug, "Update to sync post ignored",
			mlog.String("post_id", post.Id),
			mlog.String("channel_id", post.ChannelId),
		)
	}
	var rerr error
	if appErr != nil {
		rerr = errors.New(appErr.Error())
	}
	return rpost, rerr
}
func (scs *Service) syncRemotePriorityMetadata(rctx request.CTX, post *model.Post, priority *model.PostPriority, rpost *model.Post) *model.Post {
	newPriority := &model.PostPriority{
		PostId:    post.Id,
		ChannelId: post.ChannelId,
	}
	if priority.Priority != nil {
		newPriority.Priority = priority.Priority
	}
	if priority.RequestedAck != nil {
		newPriority.RequestedAck = priority.RequestedAck
	}
	if priority.PersistentNotifications != nil {
		newPriority.PersistentNotifications = priority.PersistentNotifications
	}
	savedPriority, priorityErr := scs.server.GetStore().PostPriority().Save(newPriority)
	if priorityErr != nil {
		scs.server.Log().Log(mlog.LvlSharedChannelServiceError, "Error saving post priority from remote",
			mlog.String("post_id", post.Id),
			mlog.String("channel_id", post.ChannelId),
			mlog.Err(priorityErr),
		)
	} else {
		if rpost.Metadata == nil {
			rpost.Metadata = &model.PostMetadata{}
		}
		rpost.Metadata.Priority = savedPriority
	}
	return rpost
}
func (scs *Service) syncRemoteAcknowledgementsMetadata(rctx request.CTX, post *model.Post, acknowledgements []*model.PostAcknowledgement, rpost *model.Post) *model.Post {
	existingAcks, appErrGet := scs.app.GetAcknowledgementsForPost(post.Id)
	if appErrGet != nil {
		scs.server.Log().Log(mlog.LvlSharedChannelServiceError, "Error getting existing acknowledgements for remote sync",
			mlog.String("post_id", post.Id),
			mlog.Err(appErrGet),
		)
	} else if len(existingAcks) > 0 {
		if nErr := scs.server.GetStore().PostAcknowledgement().BatchDelete(existingAcks); nErr != nil {
			scs.server.Log().Log(mlog.LvlSharedChannelServiceError, "Error batch deleting acknowledgements for remote sync",
				mlog.String("post_id", post.Id),
				mlog.Int("count", len(existingAcks)),
				mlog.Err(nErr),
			)
		}
	}
	userIDs := make([]string, 0, len(acknowledgements))
	for _, ack := range acknowledgements {
		userIDs = append(userIDs, ack.UserId)
	}
	var savedAcks []*model.PostAcknowledgement
	if len(userIDs) > 0 {
		var appErrAck *model.AppError
		savedAcks, appErrAck = scs.app.SaveAcknowledgementsForPost(rctx, post.Id, userIDs)
		if appErrAck != nil {
			scs.server.Log().Log(mlog.LvlSharedChannelServiceError, "Error syncing remote post acknowledgements",
				mlog.String("post_id", post.Id),
				mlog.Int("count", len(userIDs)),
				mlog.Err(appErrAck),
			)
			savedAcks = acknowledgements
		}
	}
	if rpost.Metadata == nil {
		rpost.Metadata = &model.PostMetadata{}
	}
	rpost.Metadata.Acknowledgements = savedAcks
	return rpost
}
func (scs *Service) upsertSyncReaction(reaction *model.Reaction, targetChannel *model.Channel, rc *model.RemoteCluster) (*model.Reaction, error) {
	savedReaction := reaction
	var appErr *model.AppError
	rctx := request.EmptyContext(scs.server.Log())
	post, err := scs.server.GetStore().Post().GetSingle(rctx, reaction.PostId, true)
	if err != nil {
		return nil, fmt.Errorf("error fetching post for reaction sync: %w", err)
	}
	if post.ChannelId != targetChannel.Id {
		return nil, fmt.Errorf("reaction sync failed: %w", ErrChannelIDMismatch)
	}
	existingReaction, err := scs.server.GetStore().Reaction().GetSingle(reaction.UserId, reaction.PostId, rc.RemoteId, reaction.EmojiName)
	if err != nil && !isNotFoundError(err) {
		return nil, fmt.Errorf("error fetching reaction for sync: %w", err)
	}
	if existingReaction == nil {
		user, err := scs.server.GetStore().User().Get(context.TODO(), reaction.UserId)
		if err != nil {
			return nil, fmt.Errorf("error fetching user for reaction sync: %w", err)
		}
		if user.GetRemoteID() != rc.RemoteId {
			return nil, fmt.Errorf("reaction sync failed: %w", ErrRemoteIDMismatch)
		}
		reaction.RemoteId = model.NewPointer(rc.RemoteId)
		savedReaction, appErr = scs.app.SaveReactionForPost(request.EmptyContext(scs.server.Log()), reaction)
	} else {
		if existingReaction.GetRemoteID() != rc.RemoteId {
			return nil, fmt.Errorf("reaction sync failed: %w", ErrRemoteIDMismatch)
		}
		appErr = scs.app.DeleteReactionForPost(request.EmptyContext(scs.server.Log()), reaction)
	}
	var retErr error
	if appErr != nil {
		retErr = errors.New(appErr.Error())
	}
	return savedReaction, retErr
}
func (scs *Service) upsertSyncAcknowledgement(acknowledgement *model.PostAcknowledgement, targetChannel *model.Channel, rc *model.RemoteCluster) (*model.PostAcknowledgement, error) {
	savedAcknowledgement := acknowledgement
	var appErr *model.AppError
	rctx := request.EmptyContext(scs.server.Log())
	post, err := scs.server.GetStore().Post().GetSingle(rctx, acknowledgement.PostId, true)
	if err != nil {
		return nil, fmt.Errorf("error fetching post for acknowledgement sync: %w", err)
	}
	if post.ChannelId != targetChannel.Id {
		return nil, fmt.Errorf("acknowledgement sync failed: %w", ErrChannelIDMismatch)
	}
	existingAcknowledgement, err := scs.server.GetStore().PostAcknowledgement().GetSingle(acknowledgement.UserId, acknowledgement.PostId, rc.RemoteId)
	if err != nil && !isNotFoundError(err) {
		return nil, fmt.Errorf("error fetching acknowledgement for sync: %w", err)
	}
	if existingAcknowledgement == nil {
		user, err := scs.server.GetStore().User().Get(context.TODO(), acknowledgement.UserId)
		if err != nil {
			return nil, fmt.Errorf("error fetching user for acknowledgement sync: %w", err)
		}
		if user.GetRemoteID() != rc.RemoteId {
			return nil, fmt.Errorf("acknowledgement sync failed: %w", ErrRemoteIDMismatch)
		}
		acknowledgement.RemoteId = model.NewPointer(rc.RemoteId)
		acknowledgement.ChannelId = targetChannel.Id
		savedAcknowledgement, appErr = scs.app.SaveAcknowledgementForPostWithModel(request.EmptyContext(scs.server.Log()), acknowledgement)
	} else {
		if existingAcknowledgement.GetRemoteID() != rc.RemoteId {
			return nil, fmt.Errorf("acknowledgement sync failed: %w", ErrRemoteIDMismatch)
		}
		if acknowledgement.AcknowledgedAt == 0 {
			appErr = scs.app.DeleteAcknowledgementForPostWithModel(request.EmptyContext(scs.server.Log()), acknowledgement)
		}
	}
	var retErr error
	if appErr != nil {
		retErr = errors.New(appErr.Error())
	}
	return savedAcknowledgement, retErr
}
func (scs *Service) upsertSyncUserStatus(rctx request.CTX, status *model.Status, rc *model.RemoteCluster) error {
	user, err := scs.server.GetStore().User().Get(rctx.Context(), status.UserId)
	if err != nil {
		return fmt.Errorf("error getting user when syncing status: %w", err)
	}
	if user.GetRemoteID() != rc.RemoteId {
		scs.server.Log().Log(mlog.LvlSharedChannelServiceError, "RemoteID mismatch sync'ing user status",
			mlog.String("remote", rc.Name),
			mlog.String("user_id", status.UserId),
			mlog.String("user_remote_id", user.GetRemoteID()),
		)
		return fmt.Errorf("error updating user status: %w", ErrRemoteIDMismatch)
	}
	scs.app.SaveAndBroadcastStatus(status)
	return nil
}
func (scs *Service) transformMentionsOnReceive(rctx request.CTX, post *model.Post, targetChannel *model.Channel, rc *model.RemoteCluster, mentionTransforms map[string]string) {
	if post.Message == "" || len(mentionTransforms) == 0 {
		return
	}
	for mention, userID := range mentionTransforms {
		oldMention := "@" + mention
		var newMention string
		if user, err := scs.server.GetStore().User().Get(context.Background(), userID); err == nil && user != nil {
			if strings.Contains(mention, ":") {
				newMention = "@" + user.Username
			} else {
				if user.GetRemoteID() == "" {
					newMention = "@" + mention
				} else {
					newMention = "@" + user.Username
				}
			}
		} else {
			if strings.Contains(mention, ":") {
				newMention = oldMention
			} else {
				newMention = "@" + mention + ":" + rc.Name
			}
		}
		post.Message = strings.ReplaceAll(post.Message, oldMention, newMention)
	}
}