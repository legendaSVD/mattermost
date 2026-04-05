package sharedchannel
import (
	"context"
	"encoding/json"
	"errors"
	"fmt"
	"strings"
	"github.com/mattermost/mattermost/server/public/model"
	"github.com/mattermost/mattermost/server/public/shared/mlog"
	"github.com/mattermost/mattermost/server/public/shared/request"
	"github.com/mattermost/mattermost/server/v8/channels/store"
	"github.com/mattermost/mattermost/server/v8/platform/services/remotecluster"
)
type channelInviteMsg struct {
	ChannelId            string            `json:"channel_id"`
	TeamId               string            `json:"team_id"`
	ReadOnly             bool              `json:"read_only"`
	Name                 string            `json:"name"`
	DisplayName          string            `json:"display_name"`
	Header               string            `json:"header"`
	Purpose              string            `json:"purpose"`
	Type                 model.ChannelType `json:"type"`
	CreatorID            string            `json:"creator_id"`
	DirectParticipantIDs []string          `json:"direct_participant_ids"`
	DirectParticipants   []*model.User     `json:"direct_participants"`
}
func (cim channelInviteMsg) DirectParticipantsMap() map[string]*model.User {
	dim := make(map[string]*model.User)
	for _, user := range cim.DirectParticipants {
		dim[user.Id] = user
	}
	return dim
}
type InviteOption func(msg *channelInviteMsg)
func WithDirectParticipant(participant *model.User, remoteID string) InviteOption {
	return func(msg *channelInviteMsg) {
		msg.DirectParticipantIDs = append(msg.DirectParticipantIDs, participant.Id)
		if participant.GetRemoteID() != remoteID {
			msg.DirectParticipants = append(msg.DirectParticipants, sanitizeUserForSync(participant))
		}
	}
}
func WithCreator(creatorID string) InviteOption {
	return func(msg *channelInviteMsg) {
		msg.CreatorID = creatorID
	}
}
func (scs *Service) SendChannelInvite(channel *model.Channel, userId string, rc *model.RemoteCluster, options ...InviteOption) error {
	rcs := scs.server.GetRemoteClusterService()
	if rcs == nil {
		return fmt.Errorf("cannot invite remote cluster for channel id %s; Remote Cluster Service not enabled", channel.Id)
	}
	sc, err := scs.server.GetStore().SharedChannel().Get(channel.Id)
	if err != nil {
		return err
	}
	if !rc.IsOnline() {
		if len(options) > 0 {
			scs.sendEphemeralPost(channel.Id, userId, fmt.Sprintf("Error sending channel invite for %s: %s", rc.DisplayName, model.ErrOfflineRemote))
			return model.ErrOfflineRemote
		}
		scr := &model.SharedChannelRemote{
			ChannelId:         sc.ChannelId,
			CreatorId:         userId,
			RemoteId:          rc.RemoteId,
			IsInviteAccepted:  true,
			IsInviteConfirmed: false,
			LastMembersSyncAt: 0,
		}
		if _, err = scs.server.GetStore().SharedChannel().SaveRemote(scr); err != nil {
			scs.sendEphemeralPost(channel.Id, userId, fmt.Sprintf("Error saving channel invite for %s: %v", rc.DisplayName, err))
			return err
		}
		return nil
	}
	invite := channelInviteMsg{
		ChannelId:   channel.Id,
		ReadOnly:    sc.ReadOnly,
		Name:        channel.Name,
		DisplayName: sc.ShareDisplayName,
		Header:      sc.ShareHeader,
		Purpose:     sc.SharePurpose,
		Type:        channel.Type,
	}
	for _, option := range options {
		option(&invite)
	}
	json, err := json.Marshal(invite)
	if err != nil {
		return err
	}
	msg := model.NewRemoteClusterMsg(TopicChannelInvite, json)
	onInvite := func(_ model.RemoteClusterMsg, rc *model.RemoteCluster, resp *remotecluster.Response, err error) {
		if err != nil || !resp.IsSuccess() {
			scs.sendEphemeralPost(channel.Id, userId, fmt.Sprintf("Error sending channel invite for %s: %s", rc.DisplayName, combineErrors(err, resp.Err)))
			return
		}
		existingScr, err := scs.server.GetStore().SharedChannel().GetRemoteByIds(sc.ChannelId, rc.RemoteId)
		var errNotFound *store.ErrNotFound
		if err != nil && !errors.As(err, &errNotFound) {
			scs.sendEphemeralPost(channel.Id, userId, fmt.Sprintf("Error sending channel invite for %s: %s", rc.DisplayName, err))
			return
		}
		curTime := model.GetMillis()
		if existingScr != nil {
			if existingScr.DeleteAt == 0 && existingScr.IsInviteConfirmed {
				return
			}
			existingScr.DeleteAt = 0
			existingScr.UpdateAt = curTime
			existingScr.LastPostCreateAt = curTime
			existingScr.LastPostUpdateAt = curTime
			existingScr.IsInviteConfirmed = true
			if _, sErr := scs.server.GetStore().SharedChannel().UpdateRemote(existingScr); sErr != nil {
				scs.sendEphemeralPost(channel.Id, userId, fmt.Sprintf("Error confirming channel invite for %s: %v", rc.DisplayName, sErr))
				return
			}
		} else {
			scr := &model.SharedChannelRemote{
				ChannelId:         sc.ChannelId,
				CreatorId:         userId,
				RemoteId:          rc.RemoteId,
				IsInviteAccepted:  true,
				IsInviteConfirmed: true,
				LastPostCreateAt:  curTime,
				LastPostUpdateAt:  curTime,
				LastMembersSyncAt: 0,
			}
			if _, err = scs.server.GetStore().SharedChannel().SaveRemote(scr); err != nil {
				scs.sendEphemeralPost(channel.Id, userId, fmt.Sprintf("Error confirming channel invite for %s: %v", rc.DisplayName, err))
				return
			}
		}
		scs.NotifyChannelChanged(sc.ChannelId)
		scs.sendEphemeralPost(channel.Id, userId, fmt.Sprintf("`%s` has been added to channel.", rc.DisplayName))
		scs.NotifyMembershipChanged(sc.ChannelId, "")
	}
	if rc.IsPlugin() {
		onInvite(msg, rc, &remotecluster.Response{Status: remotecluster.ResponseStatusOK}, nil)
		return nil
	}
	ctx, cancel := context.WithTimeout(context.Background(), remotecluster.SendTimeout)
	defer cancel()
	return rcs.SendMsg(ctx, msg, rc, onInvite)
}
func combineErrors(err error, serror string) string {
	var sb strings.Builder
	if err != nil {
		sb.WriteString(err.Error())
	}
	if serror != "" {
		if sb.Len() > 0 {
			sb.WriteString("; ")
		}
		sb.WriteString(serror)
	}
	return sb.String()
}
func (scs *Service) onReceiveChannelInvite(msg model.RemoteClusterMsg, rc *model.RemoteCluster, _ *remotecluster.Response) error {
	if len(msg.Payload) == 0 {
		return nil
	}
	var invite channelInviteMsg
	if err := json.Unmarshal(msg.Payload, &invite); err != nil {
		return fmt.Errorf("invalid channel invite: %w", err)
	}
	scs.server.Log().Log(mlog.LvlSharedChannelServiceDebug, "Channel invite received",
		mlog.String("remote", rc.DisplayName),
		mlog.String("channel_id", invite.ChannelId),
		mlog.String("channel_name", invite.Name),
		mlog.String("team_id", invite.TeamId),
	)
	existingScr, err := scs.server.GetStore().SharedChannel().GetRemoteByIds(invite.ChannelId, rc.RemoteId)
	var errNotFound *store.ErrNotFound
	if err != nil && !errors.As(err, &errNotFound) {
		return fmt.Errorf("cannot get deleted shared channel remote (channel_id=%s): %w", invite.ChannelId, err)
	}
	if existingScr != nil && existingScr.DeleteAt == 0 {
		return nil
	}
	var channel *model.Channel
	var created bool
	if existingScr == nil {
		var err error
		_, err = scs.server.GetStore().Channel().Get(invite.ChannelId, true)
		if err == nil {
			return fmt.Errorf("cannot create new shared channel (channel_id=%s): %w", invite.ChannelId, model.ErrChannelAlreadyExists)
		}
		if channel, created, err = scs.handleChannelCreation(invite, rc); err != nil {
			return err
		}
		if invite.ChannelId != channel.Id {
			scs.server.Log().Log(mlog.LvlSharedChannelServiceError, "Channel invite failed - channel created/fetched with wrong id",
				mlog.String("remote", rc.DisplayName),
				mlog.String("channel_id", invite.ChannelId),
				mlog.String("channel_type", invite.Type),
				mlog.String("channel_name", invite.Name),
				mlog.String("team_id", invite.TeamId),
				mlog.Array("dm_partics", invite.DirectParticipantIDs),
			)
			return fmt.Errorf("cannot create shared channel (channel_id=%s channel_type=%s): %w", invite.ChannelId, invite.Type, model.ErrChannelAlreadyExists)
		}
		if invite.ReadOnly {
			if err := scs.makeChannelReadOnly(channel); err != nil {
				return fmt.Errorf("cannot make channel readonly `%s`: %w", invite.ChannelId, err)
			}
		}
	} else {
		var err error
		channel, err = scs.server.GetStore().Channel().Get(invite.ChannelId, true)
		if err != nil {
			return fmt.Errorf("cannot get channel (channel_id=%s) to restore a shared channel remote: %w", invite.ChannelId, err)
		}
	}
	sharedChannel := &model.SharedChannel{
		ChannelId:        channel.Id,
		TeamId:           channel.TeamId,
		Home:             false,
		ReadOnly:         existingScr == nil && invite.ReadOnly,
		ShareName:        channel.Name,
		ShareDisplayName: channel.DisplayName,
		SharePurpose:     channel.Purpose,
		ShareHeader:      channel.Header,
		CreatorId:        rc.CreatorId,
		RemoteId:         rc.RemoteId,
		Type:             channel.Type,
	}
	if _, err := scs.server.GetStore().SharedChannel().Save(sharedChannel); err != nil {
		if created {
			scs.app.PermanentDeleteChannel(request.EmptyContext(scs.server.Log()), channel)
		}
		return fmt.Errorf("cannot create shared channel (channel_id=%s): %w", invite.ChannelId, err)
	}
	curTime := model.GetMillis()
	if existingScr != nil {
		existingScr.DeleteAt = 0
		existingScr.UpdateAt = curTime
		existingScr.LastPostCreateAt = curTime
		existingScr.LastPostUpdateAt = curTime
		if _, err := scs.server.GetStore().SharedChannel().UpdateRemote(existingScr); err != nil {
			return fmt.Errorf("cannot restore deleted shared channel remote (channel_id=%s): %w", invite.ChannelId, err)
		}
		scs.NotifyMembershipChanged(channel.Id, "")
	} else {
		creatorID := channel.CreatorId
		if creatorID == "" {
			creatorID = invite.CreatorID
		}
		scr := &model.SharedChannelRemote{
			Id:                model.NewId(),
			ChannelId:         channel.Id,
			CreatorId:         creatorID,
			IsInviteAccepted:  true,
			IsInviteConfirmed: true,
			RemoteId:          rc.RemoteId,
			LastPostCreateAt:  model.GetMillis(),
			LastPostUpdateAt:  model.GetMillis(),
			LastMembersSyncAt: 0,
		}
		if _, err := scs.server.GetStore().SharedChannel().SaveRemote(scr); err != nil {
			if created {
				scs.app.PermanentDeleteChannel(request.EmptyContext(scs.server.Log()), channel)
			}
			scs.server.GetStore().SharedChannel().Delete(sharedChannel.ChannelId)
			return fmt.Errorf("cannot create shared channel remote (channel_id=%s): %w", invite.ChannelId, err)
		}
		scs.NotifyMembershipChanged(channel.Id, "")
	}
	return nil
}
func (scs *Service) handleChannelCreation(invite channelInviteMsg, rc *model.RemoteCluster) (*model.Channel, bool, error) {
	if invite.Type == model.ChannelTypeDirect {
		return scs.createDirectChannel(invite, rc)
	}
	if invite.Type == model.ChannelTypeGroup {
		return scs.createGroupChannel(invite, rc)
	}
	teamId := rc.DefaultTeamId
	if teamId == "" {
		teams, err := scs.server.GetStore().Team().GetAllPage(0, 1, nil)
		if err != nil {
			return nil, false, fmt.Errorf("cannot get team to create the channel `%s`: %w", invite.ChannelId, err)
		}
		teamId = teams[0].Id
	}
	channelNew := &model.Channel{
		Id:          invite.ChannelId,
		TeamId:      teamId,
		Type:        invite.Type,
		DisplayName: invite.DisplayName,
		Name:        invite.Name,
		Header:      invite.Header,
		Purpose:     invite.Purpose,
		CreatorId:   rc.CreatorId,
		Shared:      model.NewPointer(true),
	}
	channel, appErr := scs.app.CreateChannelWithUser(request.EmptyContext(scs.server.Log()), channelNew, rc.CreatorId)
	if appErr != nil {
		return nil, false, fmt.Errorf("cannot create channel `%s`: %w", invite.ChannelId, appErr)
	}
	return channel, true, nil
}
func (scs *Service) getOrCreateUser(userID string, participantsMap map[string]*model.User, rc *model.RemoteCluster) (*model.User, error) {
	user, err := scs.server.GetStore().User().Get(context.TODO(), userID)
	if err == nil {
		return user, nil
	}
	inviteUser, ok := participantsMap[userID]
	if !ok {
		return nil, fmt.Errorf("cannot fetch user `%q`: %w", userID, err)
	}
	var rctx request.CTX = request.EmptyContext(scs.server.Log())
	inviteUser.RemoteId = model.NewPointer(rc.RemoteId)
	user, iErr := scs.insertSyncUser(rctx, inviteUser, nil, rc)
	if iErr != nil {
		return nil, fmt.Errorf("cannot create user `%q` for remote `%q`: %w", inviteUser.Id, rc.RemoteId, iErr)
	}
	return user, nil
}
func (scs *Service) createDirectChannel(invite channelInviteMsg, rc *model.RemoteCluster) (*model.Channel, bool, error) {
	if len(invite.DirectParticipantIDs) != 2 {
		return nil, false, fmt.Errorf("cannot create direct channel `%s` insufficient participant count `%d`", invite.ChannelId, len(invite.DirectParticipantIDs))
	}
	participantsMap := invite.DirectParticipantsMap()
	user1, err := scs.getOrCreateUser(invite.DirectParticipantIDs[0], participantsMap, rc)
	if err != nil {
		return nil, false, fmt.Errorf("cannot create direct channel `%s` from invite: %w", invite.ChannelId, err)
	}
	user2, err := scs.getOrCreateUser(invite.DirectParticipantIDs[1], participantsMap, rc)
	if err != nil {
		return nil, false, fmt.Errorf("cannot create direct channel `%s` from invite: %w", invite.ChannelId, err)
	}
	userRemote := user1
	userLocal := user2
	if !userRemote.IsRemote() {
		userRemote = user2
		userLocal = user1
	}
	if !userRemote.IsRemote() {
		return nil, false, fmt.Errorf("cannot create direct channel `%s` remote user is not remote (%s)", invite.ChannelId, userRemote.Id)
	}
	if userLocal.IsRemote() {
		return nil, false, fmt.Errorf("cannot create direct channel `%s` local user is not local (%s)", invite.ChannelId, userLocal.Id)
	}
	if userRemote.GetRemoteID() != rc.RemoteId {
		return nil, false, fmt.Errorf("cannot create direct channel `%s`: %w", invite.ChannelId, ErrRemoteIDMismatch)
	}
	canSee, appErr := scs.app.UserCanSeeOtherUser(request.EmptyContext(scs.server.Log()), userRemote.Id, userLocal.Id)
	if appErr != nil {
		scs.server.Log().Log(mlog.LvlSharedChannelServiceError, "cannot check user visibility for DM creation",
			mlog.String("user_remote", userRemote.Id),
			mlog.String("user_local", userLocal.Id),
			mlog.String("channel_id", invite.ChannelId),
			mlog.Err(appErr),
		)
		return nil, false, fmt.Errorf("cannot check user visibility for DM (%s) creation: %w", invite.ChannelId, appErr)
	}
	if !canSee {
		return nil, false, fmt.Errorf("cannot create direct channel `%s`: %w", invite.ChannelId, ErrUserDMPermission)
	}
	channelName := model.GetDMNameFromIds(userRemote.Id, userLocal.Id)
	channelExists, err := scs.server.GetStore().Channel().GetByName("", channelName, true)
	if err != nil && !isNotFoundError(err) {
		return nil, false, fmt.Errorf("cannot check DM channel exists (%s): %w", channelName, err)
	}
	if channelExists != nil {
		if channelExists.Id == invite.ChannelId {
			return channelExists, false, nil
		}
		return nil, false, fmt.Errorf("cannot create direct channel `%s`: channel exists with wrong id", channelName)
	}
	channel, appErr := scs.app.GetOrCreateDirectChannel(request.EmptyContext(scs.server.Log()), userRemote.Id, userLocal.Id, model.WithID(invite.ChannelId))
	if appErr != nil {
		return nil, false, fmt.Errorf("cannot create direct channel `%s`: %w", invite.ChannelId, appErr)
	}
	return channel, true, nil
}
func (scs *Service) createGroupChannel(invite channelInviteMsg, rc *model.RemoteCluster) (*model.Channel, bool, error) {
	if len(invite.DirectParticipantIDs) > model.ChannelGroupMaxUsers || len(invite.DirectParticipantIDs) < model.ChannelGroupMinUsers {
		return nil, false, fmt.Errorf("cannot create group channel `%s` bad participant count `%d`", invite.ChannelId, len(invite.DirectParticipantIDs))
	}
	participantsMap := invite.DirectParticipantsMap()
	remoteIDMap := map[string]bool{}
	hasLocalUsers := false
	for _, participantID := range invite.DirectParticipantIDs {
		user, err := scs.getOrCreateUser(participantID, participantsMap, rc)
		if err != nil {
			return nil, false, fmt.Errorf("cannot create group channel `%s` from invite: %w", invite.ChannelId, err)
		}
		if user.IsRemote() {
			remoteIDMap[user.GetRemoteID()] = true
		} else {
			hasLocalUsers = true
		}
	}
	if len(remoteIDMap) == 0 {
		return nil, false, fmt.Errorf("cannot create group channel `%s` there are no remote users", invite.ChannelId)
	}
	if !hasLocalUsers {
		return nil, false, fmt.Errorf("cannot create group channel `%s` there are no local users", invite.ChannelId)
	}
	channelName := model.GetGroupNameFromUserIds(invite.DirectParticipantIDs)
	channelExists, err := scs.server.GetStore().Channel().GetByName("", channelName, true)
	if err != nil && !isNotFoundError(err) {
		return nil, false, fmt.Errorf("cannot check GM channel exists (%s): %w", channelName, err)
	}
	if channelExists != nil {
		if channelExists.Id == invite.ChannelId {
			return channelExists, false, nil
		}
		return nil, false, fmt.Errorf("cannot create group channel `%s`: channel exists with wrong id", channelName)
	}
	channel, appErr := scs.app.CreateGroupChannel(request.EmptyContext(scs.server.Log()), invite.DirectParticipantIDs, invite.CreatorID, model.WithID(invite.ChannelId))
	if appErr != nil {
		return nil, false, fmt.Errorf("cannot create group channel `%s`: %w", invite.ChannelId, appErr)
	}
	return channel, true, nil
}