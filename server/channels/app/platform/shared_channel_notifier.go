package platform
import (
	"context"
	"fmt"
	"slices"
	"github.com/pkg/errors"
	"github.com/mattermost/mattermost/server/public/model"
	"github.com/mattermost/mattermost/server/public/shared/mlog"
	"github.com/mattermost/mattermost/server/v8/platform/services/sharedchannel"
)
var sharedChannelEventsForSync = []model.WebsocketEventType{
	model.WebsocketEventPosted,
	model.WebsocketEventPostEdited,
	model.WebsocketEventPostDeleted,
	model.WebsocketEventReactionAdded,
	model.WebsocketEventReactionRemoved,
	model.WebsocketEventAcknowledgementAdded,
	model.WebsocketEventAcknowledgementRemoved,
}
var sharedChannelEventsForInvitation = []model.WebsocketEventType{
	model.WebsocketEventDirectAdded,
}
func (ps *PlatformService) SharedChannelSyncHandler(event *model.WebSocketEvent) {
	syncService := ps.GetSharedChannelService()
	if syncService == nil {
		return
	}
	if isEligibleForEvents(syncService, event, sharedChannelEventsForSync) {
		err := handleContentSync(ps, syncService, event)
		if err != nil {
			mlog.Warn(
				err.Error(),
				mlog.String("event", event.EventType()),
				mlog.String("action", "content_sync"),
			)
		}
	} else if isEligibleForEvents(syncService, event, sharedChannelEventsForInvitation) {
		err := handleInvitation(ps, syncService, event)
		if err != nil {
			mlog.Warn(
				err.Error(),
				mlog.String("event", event.EventType()),
				mlog.String("action", "invitation"),
			)
		}
	}
}
func isEligibleForEvents(syncService SharedChannelServiceIFace, event *model.WebSocketEvent, events []model.WebsocketEventType) bool {
	return syncServiceEnabled(syncService) &&
		eventHasChannel(event) &&
		slices.Contains(events, event.EventType())
}
func eventHasChannel(event *model.WebSocketEvent) bool {
	return event.GetBroadcast() != nil &&
		event.GetBroadcast().ChannelId != ""
}
func syncServiceEnabled(syncService SharedChannelServiceIFace) bool {
	return syncService != nil &&
		syncService.Active()
}
func handleContentSync(ps *PlatformService, syncService SharedChannelServiceIFace, event *model.WebSocketEvent) error {
	channel, err := findChannel(ps, event.GetBroadcast().ChannelId)
	if err != nil {
		return err
	}
	shouldNotify := channel.IsShared()
	if channel.Type == model.ChannelTypeDirect || channel.Type == model.ChannelTypeGroup {
		filter := model.RemoteClusterQueryFilter{
			NotInChannel:   channel.Id,
			OnlyConfirmed:  true,
			RequireOptions: model.BitflagOptionAutoShareDMs,
		}
		remotes, err := ps.Store.RemoteCluster().GetAll(0, 999999, filter)
		if err != nil {
			return fmt.Errorf("cannot fetch remote clusters: %w", err)
		}
		for _, remote := range remotes {
			if err := syncService.InviteRemoteToChannel(channel.Id, remote.RemoteId, remote.CreatorId, true); err != nil {
				return fmt.Errorf("cannot invite remote %s to channel %s: %w", remote.RemoteId, channel.Id, err)
			}
			shouldNotify = true
		}
	}
	if shouldNotify {
		syncService.NotifyChannelChanged(channel.Id)
	}
	return nil
}
func handleInvitation(ps *PlatformService, syncService SharedChannelServiceIFace, event *model.WebSocketEvent) error {
	channel, err := findChannel(ps, event.GetBroadcast().ChannelId)
	if err != nil {
		return err
	}
	if channel == nil || !channel.IsShared() {
		return nil
	}
	creator, err := getUserFromEvent(ps, event, "creator_id")
	if err != nil {
		return err
	}
	if creator == nil || creator.IsRemote() {
		return nil
	}
	participant, err := getUserFromEvent(ps, event, "teammate_id")
	if err != nil {
		return err
	}
	if participant == nil || participant.RemoteId == nil {
		return nil
	}
	rc, err := ps.Store.RemoteCluster().Get(*participant.RemoteId, false)
	if err != nil {
		return errors.Wrap(err, fmt.Sprintf("couldn't find remote cluster %s, for creating shared channel invitation for a DM", *participant.RemoteId))
	}
	return syncService.SendChannelInvite(channel, creator.Id, rc, sharedchannel.WithDirectParticipant(creator, rc.RemoteId), sharedchannel.WithDirectParticipant(participant, rc.RemoteId))
}
func getUserFromEvent(ps *PlatformService, event *model.WebSocketEvent, key string) (*model.User, error) {
	userID, ok := event.GetData()[key].(string)
	if !ok || userID == "" {
		return nil, fmt.Errorf("received websocket message that is eligible for sending an invitation but message does not have `%s` present", key)
	}
	user, err := ps.Store.User().Get(context.Background(), userID)
	if err != nil {
		return nil, errors.Wrap(err, "couldn't find user for creating shared channel invitation for a DM")
	}
	return user, nil
}
func findChannel(server *PlatformService, channelId string) (*model.Channel, error) {
	channel, err := server.Store.Channel().Get(channelId, true)
	if err != nil {
		return nil, errors.Wrap(err, "received websocket message that is eligible for shared channel sync but channel does not exist")
	}
	return channel, nil
}