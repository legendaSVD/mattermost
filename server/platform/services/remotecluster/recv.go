package remotecluster
import (
	"fmt"
	"github.com/mattermost/mattermost/server/public/model"
	"github.com/mattermost/mattermost/server/public/shared/mlog"
)
func (rcs *Service) ReceiveIncomingMsg(rc *model.RemoteCluster, msg model.RemoteClusterMsg) Response {
	rcs.mux.RLock()
	defer rcs.mux.RUnlock()
	if metrics := rcs.server.GetMetrics(); metrics != nil {
		metrics.IncrementRemoteClusterMsgReceivedCounter(rc.RemoteId)
	}
	rcSanitized := *rc
	rcSanitized.Token = ""
	rcSanitized.RemoteToken = ""
	var response Response
	response.Status = ResponseStatusOK
	listeners := rcs.getTopicListeners(msg.Topic)
	for _, l := range listeners {
		if err := callback(l, msg, &rcSanitized, &response); err != nil {
			rcs.server.Log().Log(mlog.LvlRemoteClusterServiceError, "Error from remote cluster message listener",
				mlog.String("msgId", msg.Id), mlog.String("topic", msg.Topic), mlog.String("remote", rc.DisplayName), mlog.Err(err))
			response.Status = ResponseStatusFail
			response.Err = err.Error()
		}
	}
	return response
}
func callback(listener TopicListener, msg model.RemoteClusterMsg, rc *model.RemoteCluster, resp *Response) (err error) {
	defer func() {
		if r := recover(); r != nil {
			err = fmt.Errorf("%v", r)
		}
	}()
	err = listener(msg, rc, resp)
	return
}
func (rcs *Service) ReceiveInviteConfirmation(confirm model.RemoteClusterInvite) (*model.RemoteCluster, error) {
	store := rcs.server.GetStore().RemoteCluster()
	rc, err := store.Get(confirm.RemoteId, false)
	if err != nil {
		return nil, fmt.Errorf("cannot accept invite confirmation for remote %s: %w", confirm.RemoteId, err)
	}
	if rc.IsConfirmed() {
		return nil, fmt.Errorf("cannot accept invite confirmation for remote %s: %w", confirm.RemoteId, RemoteClusterAlreadyConfirmedError)
	}
	rc.SiteURL = confirm.SiteURL
	rc.RemoteToken = confirm.Token
	if confirm.Version >= 2 && confirm.RefreshedToken != "" {
		if confirm.RefreshedToken == rc.Token {
			return nil, fmt.Errorf("cannot accept invite confirmation for remote %s: RefreshedToken must be different from the original invite token", confirm.RemoteId)
		}
		rc.Token = confirm.RefreshedToken
	} else {
		rc.Token = model.NewId()
	}
	rcUpdated, err := store.Update(rc)
	if err != nil {
		return nil, fmt.Errorf("cannot apply invite confirmation for remote %s: %w", confirm.RemoteId, err)
	}
	go rcs.PingNow(rcUpdated)
	return rcUpdated, nil
}