package sharedchannel
import (
	"context"
	"fmt"
	"time"
	"github.com/mattermost/mattermost/server/public/model"
	"github.com/mattermost/mattermost/server/public/shared/i18n"
	"github.com/mattermost/mattermost/server/public/shared/mlog"
	"github.com/mattermost/mattermost/server/public/shared/request"
	"github.com/mattermost/mattermost/server/v8/platform/services/remotecluster"
)
type syncTask struct {
	id        string
	channelID string
	userID    string
	remoteID  string
	AddedAt   time.Time
	existingMsg *model.SyncMsg
	retryCount  int
	retryMsg    *model.SyncMsg
	schedule    time.Time
	originRemoteID string
}
func newSyncTask(channelID, userID string, remoteID string, existingMsg, retryMsg *model.SyncMsg) syncTask {
	var retryID string
	if retryMsg != nil {
		retryID = retryMsg.Id
	}
	taskID := channelID + userID + remoteID + retryID
	if existingMsg != nil && len(existingMsg.MembershipChanges) > 1 {
		batchID := model.NewId()[:8]
		taskID = channelID + "batch" + batchID + remoteID + retryID
	}
	return syncTask{
		id:          taskID,
		channelID:   channelID,
		userID:      userID,
		remoteID:    remoteID,
		existingMsg: existingMsg,
		retryMsg:    retryMsg,
		schedule:    time.Now(),
	}
}
func (st *syncTask) incRetry() bool {
	st.retryCount++
	return st.retryCount <= MaxRetries
}
func (scs *Service) NotifyChannelChanged(channelID string) {
	if rcs := scs.server.GetRemoteClusterService(); rcs == nil {
		return
	}
	task := newSyncTask(channelID, "", "", nil, nil)
	task.schedule = time.Now().Add(NotifyMinimumDelay)
	scs.addTask(task)
}
func (scs *Service) NotifyUserProfileChanged(userID string) {
	if rcs := scs.server.GetRemoteClusterService(); rcs == nil {
		return
	}
	scusers, err := scs.server.GetStore().SharedChannel().GetUsersForUser(userID)
	if err != nil {
		scs.server.Log().Log(mlog.LvlSharedChannelServiceError, "Failed to fetch shared channel users",
			mlog.String("userID", userID),
			mlog.Err(err),
		)
		return
	}
	if len(scusers) == 0 {
		return
	}
	notified := make(map[string]struct{})
	for _, user := range scusers {
		combo := user.UserId + user.RemoteId
		if _, ok := notified[combo]; ok {
			continue
		}
		notified[combo] = struct{}{}
		task := newSyncTask(user.ChannelId, "", user.RemoteId, nil, nil)
		task.schedule = time.Now().Add(NotifyMinimumDelay)
		scs.addTask(task)
	}
}
func (scs *Service) NotifyUserStatusChanged(status *model.Status) {
	if rcs := scs.server.GetRemoteClusterService(); rcs == nil {
		return
	}
	if *scs.server.Config().ConnectedWorkspacesSettings.DisableSharedChannelsStatusSync {
		return
	}
	if status.UserId == "" {
		scs.server.Log().Log(mlog.LvlSharedChannelServiceError, "Received invalid status for sync",
			mlog.String("userID", status.UserId),
		)
		return
	}
	scusers, err := scs.server.GetStore().SharedChannel().GetUsersForUser(status.UserId)
	if err != nil {
		scs.server.Log().Log(mlog.LvlSharedChannelServiceError, "Failed to fetch shared channel users",
			mlog.String("userID", status.UserId),
			mlog.Err(err),
		)
		return
	}
	if len(scusers) == 0 {
		return
	}
	existingMsg := &model.SyncMsg{Statuses: []*model.Status{status}}
	notified := make(map[string]struct{})
	for _, user := range scusers {
		combo := user.UserId + user.RemoteId
		if _, ok := notified[combo]; ok {
			continue
		}
		notified[combo] = struct{}{}
		task := newSyncTask(user.ChannelId, user.UserId, user.RemoteId, existingMsg, nil)
		task.schedule = time.Now().Add(NotifyMinimumDelay)
		scs.addTask(task)
	}
}
func (scs *Service) SendPendingInvitesForRemote(rc *model.RemoteCluster) {
	if rcs := scs.server.GetRemoteClusterService(); rcs == nil {
		return
	}
	scs.server.Log().Log(mlog.LvlSharedChannelServiceDebug, "Processing pending invites for remote after reconnection",
		mlog.String("remote", rc.DisplayName),
		mlog.String("remoteId", rc.RemoteId),
	)
	opts := model.SharedChannelRemoteFilterOpts{
		RemoteId:         rc.RemoteId,
		ExcludeConfirmed: true,
	}
	scrs, err := scs.server.GetStore().SharedChannel().GetRemotes(0, 999999, opts)
	if err != nil {
		scs.server.Log().Log(mlog.LvlSharedChannelServiceError, "Failed to fetch shared channel remotes for pending invites",
			mlog.String("remote", rc.DisplayName),
			mlog.String("remoteId", rc.RemoteId),
			mlog.Err(err),
		)
		return
	}
	for _, scr := range scrs {
		channel, err := scs.server.GetStore().Channel().Get(scr.ChannelId, true)
		if err != nil {
			scs.server.Log().Log(mlog.LvlSharedChannelServiceError, "Failed to fetch channel for pending invite",
				mlog.String("remote_id", scr.RemoteId),
				mlog.String("channel_id", scr.ChannelId),
				mlog.String("sharedchannelremote_id", scr.Id),
				mlog.Err(err),
			)
			continue
		}
		if err := scs.SendChannelInvite(channel, scr.CreatorId, rc); err != nil {
			scs.server.Log().Log(mlog.LvlSharedChannelServiceError, "Failed to send pending invite",
				mlog.String("remote_id", scr.RemoteId),
				mlog.String("channel_id", scr.ChannelId),
				mlog.String("sharedchannelremote_id", scr.Id),
				mlog.Err(err),
			)
			continue
		}
		scs.server.Log().Log(mlog.LvlSharedChannelServiceDebug, "Pending invite sent",
			mlog.String("remote", rc.DisplayName),
			mlog.String("remoteId", rc.RemoteId),
			mlog.String("channel_id", scr.ChannelId),
			mlog.String("sharedchannelremote_id", scr.Id),
		)
	}
}
func (scs *Service) ForceSyncForRemote(rc *model.RemoteCluster) {
	if rcs := scs.server.GetRemoteClusterService(); rcs == nil {
		return
	}
	opts := model.SharedChannelRemoteFilterOpts{
		RemoteId: rc.RemoteId,
	}
	scrs, err := scs.server.GetStore().SharedChannel().GetRemotes(0, 999999, opts)
	if err != nil {
		scs.server.Log().Log(mlog.LvlSharedChannelServiceError, "Failed to fetch shared channel remotes",
			mlog.String("remote", rc.DisplayName),
			mlog.String("remoteId", rc.RemoteId),
			mlog.Err(err),
		)
		return
	}
	for _, scr := range scrs {
		task := newSyncTask(scr.ChannelId, "", rc.RemoteId, nil, nil)
		task.schedule = time.Now().Add(NotifyMinimumDelay)
		scs.addTask(task)
	}
}
func (scs *Service) addTask(task syncTask) {
	task.AddedAt = time.Now()
	scs.mux.Lock()
	if originalTask, ok := scs.tasks[task.id]; ok {
		originalTask.existingMsg = task.existingMsg
		if task.originRemoteID != originalTask.originRemoteID {
			originalTask.originRemoteID = ""
		}
		scs.tasks[task.id] = originalTask
	} else {
		scs.tasks[task.id] = task
	}
	scs.mux.Unlock()
	select {
	case scs.changeSignal <- struct{}{}:
	default:
	}
}
func (scs *Service) syncLoop(done chan struct{}) {
	delay := time.NewTimer(NotifyMinimumDelay)
	defer stopTimer(delay)
	for {
		select {
		case <-scs.changeSignal:
			if wait := scs.doSync(); wait > 0 {
				stopTimer(delay)
				delay.Reset(wait)
			}
		case <-delay.C:
			if wait := scs.doSync(); wait > 0 {
				delay.Reset(wait)
			}
		case <-done:
			return
		}
	}
}
func stopTimer(timer *time.Timer) {
	timer.Stop()
	select {
	case <-timer.C:
	default:
	}
}
func (scs *Service) doSync() time.Duration {
	var task syncTask
	var ok bool
	var shortestWait time.Duration
	metrics := scs.server.GetMetrics()
	if metrics != nil {
		scs.mux.Lock()
		size := len(scs.tasks)
		scs.mux.Unlock()
		metrics.ObserveSharedChannelsQueueSize(int64(size))
	}
	for {
		task, ok, shortestWait = scs.removeOldestTask()
		if !ok {
			break
		}
		if metrics != nil {
			metrics.ObserveSharedChannelsTaskInQueueDuration(time.Since(task.AddedAt).Seconds())
		}
		if err := scs.processTask(task); err != nil {
			if task.incRetry() {
				scs.addTask(task)
			} else {
				scs.server.Log().Error("Failed to synchronize shared channel",
					mlog.String("channelId", task.channelID),
					mlog.String("remoteId", task.remoteID),
					mlog.Err(err),
				)
			}
		}
	}
	return shortestWait
}
func (scs *Service) removeOldestTask() (syncTask, bool, time.Duration) {
	scs.mux.Lock()
	defer scs.mux.Unlock()
	var oldestTask syncTask
	var oldestKey string
	var shortestWait time.Duration
	for key, task := range scs.tasks {
		if wait := time.Until(task.schedule); wait > 0 {
			if wait < shortestWait || shortestWait == 0 {
				shortestWait = wait
			}
			continue
		}
		if task.AddedAt.Before(oldestTask.AddedAt) || oldestTask.AddedAt.IsZero() {
			oldestKey = key
			oldestTask = task
		}
	}
	if oldestKey != "" {
		delete(scs.tasks, oldestKey)
		return oldestTask, true, shortestWait
	}
	return oldestTask, false, shortestWait
}
func (scs *Service) processTask(task syncTask) error {
	remotesMap := make(map[string]*model.RemoteCluster)
	if task.remoteID == "" {
		filter := model.RemoteClusterQueryFilter{
			InChannel:     task.channelID,
			OnlyConfirmed: true,
		}
		remotes, err := scs.server.GetStore().RemoteCluster().GetAll(0, 999999, filter)
		if err != nil {
			return err
		}
		for _, r := range remotes {
			if task.originRemoteID != "" && r.RemoteId == task.originRemoteID {
				continue
			}
			remotesMap[r.RemoteId] = r
		}
		filter = model.RemoteClusterQueryFilter{
			RequireOptions: model.BitflagOptionAutoInvited,
			OnlyConfirmed:  true,
		}
		remotesAutoInvited, err := scs.server.GetStore().RemoteCluster().GetAll(0, 999999, filter)
		if err != nil {
			return err
		}
		for _, r := range remotesAutoInvited {
			if task.originRemoteID != "" && r.RemoteId == task.originRemoteID {
				continue
			}
			remotesMap[r.RemoteId] = r
		}
	} else {
		rc, err := scs.server.GetStore().RemoteCluster().Get(task.remoteID, false)
		if err != nil {
			return err
		}
		if !rc.IsOnline() {
			return fmt.Errorf("Failed updating shared channel '%s' for offline remote cluster '%s'", task.channelID, rc.DisplayName)
		}
		remotesMap[rc.RemoteId] = rc
	}
	for _, rc := range remotesMap {
		rtask := task
		rtask.remoteID = rc.RemoteId
		if err := scs.syncForRemote(rtask, rc); err != nil {
			if rtask.incRetry() {
				scs.addTask(rtask)
			} else {
				scs.server.Log().Error("Failed to synchronize shared channel for remote cluster",
					mlog.String("channelId", rtask.channelID),
					mlog.String("remote", rc.DisplayName),
					mlog.Err(err),
				)
			}
		}
	}
	return nil
}
func (scs *Service) handlePostError(postId string, task syncTask, rc *model.RemoteCluster) {
	if task.retryMsg != nil && len(task.retryMsg.Posts) == 1 && task.retryMsg.Posts[0].Id == postId {
		if task.incRetry() {
			scs.addTask(task)
		} else {
			scs.server.Log().Log(mlog.LvlSharedChannelServiceError, "error syncing post",
				mlog.String("remote", rc.DisplayName),
				mlog.String("post_id", postId),
			)
		}
		return
	}
	post, err := scs.server.GetStore().Post().GetSingle(request.EmptyContext(scs.server.Log()), postId, true)
	if err != nil {
		scs.server.Log().Log(mlog.LvlSharedChannelServiceError, "error fetching post for sync retry",
			mlog.String("remote", rc.DisplayName),
			mlog.String("post_id", postId),
			mlog.Err(err),
		)
		return
	}
	post = scs.app.PreparePostForClient(request.EmptyContext(scs.server.Log()), post, &model.PreparePostForClientOpts{IncludePriority: true})
	syncMsg := model.NewSyncMsg(task.channelID)
	syncMsg.Posts = []*model.Post{post}
	scs.addTask(newSyncTask(task.channelID, task.userID, task.remoteID, nil, syncMsg))
}
func (scs *Service) handleStatusError(userId string, task syncTask, rc *model.RemoteCluster) {
	if task.retryMsg != nil && len(task.retryMsg.Statuses) == 1 && task.retryMsg.Statuses[0].UserId == userId {
		if task.incRetry() {
			scs.addTask(task)
		} else {
			scs.server.Log().Log(mlog.LvlSharedChannelServiceError, "error syncing status",
				mlog.String("remote", rc.DisplayName),
				mlog.String("user_id", userId),
			)
		}
		return
	}
	status, err := scs.server.GetStore().Status().Get(userId)
	if err != nil {
		scs.server.Log().Log(mlog.LvlSharedChannelServiceError, "error fetching status for sync retry",
			mlog.String("remote", rc.DisplayName),
			mlog.String("user_id", userId),
			mlog.Err(err),
		)
		return
	}
	syncMsg := model.NewSyncMsg(task.channelID)
	syncMsg.Statuses = []*model.Status{status}
	scs.addTask(newSyncTask(task.channelID, task.userID, task.remoteID, nil, syncMsg))
}
func (scs *Service) notifyRemoteOffline(posts []*model.Post, rc *model.RemoteCluster) {
	notified := make(map[string]bool)
	for i := len(posts) - 1; i >= 0; i-- {
		post := posts[i]
		if didNotify := notified[post.UserId]; didNotify {
			continue
		}
		postCreateAt := model.GetTimeForMillis(post.CreateAt)
		if post.DeleteAt == 0 && post.UserId != "" && time.Since(postCreateAt) < NotifyRemoteOfflineThreshold {
			T := scs.getUserTranslations(post.UserId)
			ephemeral := &model.Post{
				ChannelId: post.ChannelId,
				Message:   T("sharedchannel.cannot_deliver_post", map[string]any{"Remote": rc.DisplayName}),
				CreateAt:  post.CreateAt + 1,
			}
			scs.app.SendEphemeralPost(request.EmptyContext(scs.server.Log()), post.UserId, ephemeral)
			notified[post.UserId] = true
		}
	}
}
func (scs *Service) updateCursorForRemote(scrId string, rc *model.RemoteCluster, cursor model.GetPostsSinceForSyncCursor) {
	if err := scs.server.GetStore().SharedChannel().UpdateRemoteCursor(scrId, cursor); err != nil {
		scs.server.Log().Log(mlog.LvlSharedChannelServiceError, "error updating cursor for shared channel remote",
			mlog.String("remote", rc.DisplayName),
			mlog.Err(err),
		)
		return
	}
	scs.server.Log().Log(mlog.LvlSharedChannelServiceDebug, "updated cursor for remote",
		mlog.String("remote_id", rc.RemoteId),
		mlog.String("remote", rc.DisplayName),
		mlog.Int("last_post_create_at", cursor.LastPostCreateAt),
		mlog.String("last_post_create_id", cursor.LastPostCreateID),
		mlog.Int("last_post_update_at", cursor.LastPostUpdateAt),
		mlog.String("last_post_update_id", cursor.LastPostUpdateID),
	)
}
func (scs *Service) getUserTranslations(userId string) i18n.TranslateFunc {
	var locale string
	user, err := scs.server.GetStore().User().Get(context.Background(), userId)
	if err == nil {
		locale = user.Locale
	}
	if locale == "" {
		locale = model.DefaultLocale
	}
	return i18n.GetUserTranslations(locale)
}
func (scs *Service) shouldUserSync(user *model.User, channelID string, rc *model.RemoteCluster) (sync bool, syncImage bool, err error) {
	if user.RemoteId != nil && *user.RemoteId == rc.RemoteId {
		return false, false, nil
	}
	scu, err := scs.server.GetStore().SharedChannel().GetSingleUser(user.Id, channelID, rc.RemoteId)
	if err != nil {
		if _, ok := err.(errNotFound); !ok {
			return false, false, err
		}
		scu = &model.SharedChannelUser{
			UserId:    user.Id,
			RemoteId:  rc.RemoteId,
			ChannelId: channelID,
		}
		if _, err = scs.server.GetStore().SharedChannel().SaveUser(scu); err != nil {
			scs.server.Log().Log(mlog.LvlSharedChannelServiceError, "Error adding user to shared channel users",
				mlog.String("user_id", user.Id),
				mlog.String("channel_id", channelID),
				mlog.String("remote_id", rc.RemoteId),
				mlog.Err(err),
			)
		} else {
			scs.server.Log().Log(mlog.LvlSharedChannelServiceDebug, "Added user to shared channel users",
				mlog.String("user_id", user.Id),
				mlog.String("channel_id", channelID),
				mlog.String("remote_id", rc.RemoteId),
			)
		}
		return true, true, nil
	}
	return user.UpdateAt > scu.LastSyncAt, user.LastPictureUpdate > scu.LastSyncAt, nil
}
func (scs *Service) syncProfileImage(user *model.User, channelID string, rc *model.RemoteCluster) {
	rcs := scs.server.GetRemoteClusterService()
	if rcs == nil {
		return
	}
	if rc.IsPlugin() {
		scs.sendProfileImageToPlugin(user, channelID, rc)
		return
	}
	ctx, cancel := context.WithTimeout(context.Background(), ProfileImageSyncTimeout)
	defer cancel()
	rcs.SendProfileImage(ctx, user.Id, rc, scs.app, func(userId string, rc *model.RemoteCluster, resp *remotecluster.Response, err error) {
		if resp.IsSuccess() {
			scs.recordProfileImageSuccess(user.Id, channelID, rc.RemoteId)
			return
		}
		scs.server.Log().Log(mlog.LvlSharedChannelServiceError, "Error synchronizing users profile image",
			mlog.String("user_id", user.Id),
			mlog.String("channel_id", channelID),
			mlog.String("remote_id", rc.RemoteId),
			mlog.Err(err),
		)
	})
}
func (scs *Service) sendProfileImageToPlugin(user *model.User, channelID string, rc *model.RemoteCluster) {
	if err := scs.app.OnSharedChannelsProfileImageSyncMsg(user, rc); err != nil {
		scs.server.Log().Log(mlog.LvlSharedChannelServiceError, "Error synchronizing users profile image for plugin",
			mlog.String("user_id", user.Id),
			mlog.String("channel_id", channelID),
			mlog.String("remote_id", rc.RemoteId),
			mlog.Err(err),
		)
	}
	scs.recordProfileImageSuccess(user.Id, channelID, rc.RemoteId)
}
func (scs *Service) recordProfileImageSuccess(userID, channelID, remoteID string) {
	scs.server.Log().Log(mlog.LvlSharedChannelServiceDebug, "Users profile image synchronized",
		mlog.String("user_id", userID),
		mlog.String("channel_id", channelID),
		mlog.String("remote_id", remoteID),
	)
	if err := scs.server.GetStore().SharedChannel().UpdateUserLastSyncAt(userID, channelID, remoteID); err != nil {
		scs.server.Log().Log(mlog.LvlSharedChannelServiceError, "Error updating users LastSyncTime after profile image update",
			mlog.String("user_id", userID),
			mlog.String("channel_id", channelID),
			mlog.String("remote_id", remoteID),
			mlog.Err(err),
		)
	}
}