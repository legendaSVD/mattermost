package sharedchannel
import (
	"fmt"
	"github.com/mattermost/mattermost/server/public/model"
	"github.com/mattermost/mattermost/server/public/shared/mlog"
	"github.com/mattermost/mattermost/server/public/shared/request"
	"github.com/mattermost/mattermost/server/v8/platform/services/remotecluster"
)
const (
	errIDAddUserToChannelFailed  = "api.channel.add_user.to.channel.failed.app_error"
	errIDSaveMemberExists        = "app.channel.save_member.exists.app_error"
	errIDGetChannelMemberMissing = "app.channel.get_member.missing.app_error"
)
func (scs *Service) onReceiveMembershipChanges(syncMsg *model.SyncMsg, rc *model.RemoteCluster, response *remotecluster.Response) error {
	if !scs.server.Config().FeatureFlags.EnableSharedChannelsMemberSync {
		return nil
	}
	if len(syncMsg.MembershipChanges) == 0 {
		return fmt.Errorf("onReceiveMembershipChanges: no membership changes")
	}
	channel, err := scs.server.GetStore().Channel().Get(syncMsg.ChannelId, true)
	if err != nil {
		return fmt.Errorf("cannot get channel for membership changes: %w", err)
	}
	_, err = scs.server.GetStore().SharedChannel().Get(syncMsg.ChannelId)
	if err != nil {
		return fmt.Errorf("cannot get shared channel for membership changes: %w", err)
	}
	var failCount int
	for _, change := range syncMsg.MembershipChanges {
		if change.ChannelId != syncMsg.ChannelId {
			scs.server.Log().Log(mlog.LvlSharedChannelServiceError, "ChannelId mismatch in membership change",
				mlog.String("expected", syncMsg.ChannelId),
				mlog.String("got", change.ChannelId),
				mlog.String("remote_id", rc.RemoteId),
			)
			failCount++
			continue
		}
		var processErr error
		if change.IsAdd {
			scs.server.Log().Log(mlog.LvlSharedChannelServiceDebug, "Adding user to channel from remote cluster",
				mlog.String("user_id", change.UserId),
				mlog.String("channel_id", change.ChannelId),
				mlog.String("remote_id", rc.RemoteId),
			)
			processErr = scs.processMemberAdd(change, channel, rc, syncMsg)
		} else {
			scs.server.Log().Log(mlog.LvlSharedChannelServiceDebug, "Removing user from channel from remote cluster",
				mlog.String("user_id", change.UserId),
				mlog.String("channel_id", change.ChannelId),
				mlog.String("remote_id", rc.RemoteId),
			)
			processErr = scs.processMemberRemove(change, rc)
		}
		if processErr != nil {
			scs.server.Log().Log(mlog.LvlSharedChannelServiceError, "Failed to process membership change",
				mlog.String("user_id", change.UserId),
				mlog.String("channel_id", change.ChannelId),
				mlog.String("remote_id", rc.RemoteId),
				mlog.Bool("is_add", change.IsAdd),
				mlog.Err(processErr),
			)
			failCount++
			continue
		}
	}
	if failCount > 0 {
		scs.server.Log().Log(mlog.LvlSharedChannelServiceWarn, "Some membership changes failed",
			mlog.String("channel_id", syncMsg.ChannelId),
			mlog.Int("total", len(syncMsg.MembershipChanges)),
			mlog.Int("failed", failCount),
		)
	}
	return nil
}
func (scs *Service) processMemberAdd(change *model.MembershipChangeMsg, channel *model.Channel, rc *model.RemoteCluster, syncMsg *model.SyncMsg) error {
	rctx := request.EmptyContext(scs.server.Log())
	var user *model.User
	var err error
	if userProfile, exists := syncMsg.Users[change.UserId]; exists {
		user, err = scs.upsertSyncUser(rctx, userProfile, channel, rc)
		if err != nil {
			return fmt.Errorf("cannot upsert user for channel add: %w", err)
		}
	} else {
		user, err = scs.server.GetStore().User().Get(rctx.Context(), change.UserId)
		if err != nil {
			return fmt.Errorf("cannot get user for channel add: %w", err)
		}
	}
	if user.GetRemoteID() != rc.RemoteId {
		return fmt.Errorf("membership add sync failed: %w", ErrRemoteIDMismatch)
	}
	if channel.Type == model.ChannelTypePrivate {
		if appErr := scs.app.AddUserToTeamByTeamId(rctx, channel.TeamId, user); appErr != nil {
			return fmt.Errorf("cannot add user to team for private channel: %w", appErr)
		}
	}
	_, appErr := scs.app.AddUserToChannel(rctx, user, channel, true)
	if appErr != nil {
		if appErr.Id != errIDAddUserToChannelFailed &&
			appErr.Id != errIDSaveMemberExists {
			return fmt.Errorf("cannot add user to channel: %w", appErr)
		}
	}
	return nil
}
func (scs *Service) processMemberRemove(change *model.MembershipChangeMsg, rc *model.RemoteCluster) error {
	channel, err := scs.server.GetStore().Channel().Get(change.ChannelId, true)
	if err != nil {
		scs.server.Log().Log(mlog.LvlSharedChannelServiceWarn, "Cannot find channel for member removal",
			mlog.String("channel_id", change.ChannelId),
			mlog.String("user_id", change.UserId),
			mlog.Err(err),
		)
		return nil
	}
	rctx := request.EmptyContext(scs.server.Log())
	user, userErr := scs.server.GetStore().User().Get(rctx.Context(), change.UserId)
	if userErr != nil {
		return fmt.Errorf("cannot get user for channel remove: %w", userErr)
	}
	if user.GetRemoteID() != rc.RemoteId {
		return fmt.Errorf("membership remove sync failed: %w", ErrRemoteIDMismatch)
	}
	appErr := scs.app.RemoveUserFromChannel(rctx, change.UserId, "", channel)
	if appErr != nil {
		if appErr.Id == errIDGetChannelMemberMissing {
			return nil
		}
		return fmt.Errorf("cannot remove user from channel: %w", appErr)
	}
	return nil
}