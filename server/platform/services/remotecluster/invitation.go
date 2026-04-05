package remotecluster
import (
	"encoding/json"
	"errors"
	"fmt"
	"github.com/mattermost/mattermost/server/public/model"
)
func (rcs *Service) AcceptInvitation(invite *model.RemoteClusterInvite, name string, displayName string, creatorId string, siteURL string, defaultTeamId string) (*model.RemoteCluster, error) {
	var remoteToken string
	if invite.Version >= 2 {
		remoteToken = model.NewId()
	} else {
		remoteToken = invite.Token
	}
	rc := &model.RemoteCluster{
		RemoteId:      invite.RemoteId,
		Name:          name,
		DisplayName:   displayName,
		DefaultTeamId: defaultTeamId,
		Token:         model.NewId(),
		RemoteToken:   remoteToken,
		SiteURL:       invite.SiteURL,
		CreatorId:     creatorId,
	}
	rcSaved, err := rcs.server.GetStore().RemoteCluster().Save(rc)
	if err != nil {
		return nil, err
	}
	frame, err := makeConfirmFrame(rcSaved, siteURL)
	if err != nil {
		return nil, err
	}
	url := fmt.Sprintf("%s/%s", rcSaved.SiteURL, ConfirmInviteURL)
	rc.RemoteToken = invite.Token
	resp, err := rcs.sendFrameToRemote(PingTimeout, rc, frame, url)
	if err != nil {
		rcs.server.GetStore().RemoteCluster().Delete(rcSaved.RemoteId)
		return nil, err
	}
	var response Response
	err = json.Unmarshal(resp, &response)
	if err != nil {
		rcs.server.GetStore().RemoteCluster().Delete(rcSaved.RemoteId)
		return nil, fmt.Errorf("invalid response from remote server: %w", err)
	}
	if !response.IsSuccess() {
		rcs.server.GetStore().RemoteCluster().Delete(rcSaved.RemoteId)
		return nil, errors.New(response.Err)
	}
	go rcs.PingNow(rcSaved)
	return rcSaved, nil
}
func makeConfirmFrame(rc *model.RemoteCluster, siteURL string) (*model.RemoteClusterFrame, error) {
	confirm := model.RemoteClusterInvite{
		RemoteId:       rc.RemoteId,
		SiteURL:        siteURL,
		Token:          rc.Token,
		RefreshedToken: rc.RemoteToken,
		Version:        3,
	}
	confirmRaw, err := json.Marshal(confirm)
	if err != nil {
		return nil, err
	}
	msg := model.NewRemoteClusterMsg(InvitationTopic, confirmRaw)
	frame := &model.RemoteClusterFrame{
		RemoteId: rc.RemoteId,
		Msg:      msg,
	}
	return frame, nil
}