package api4
import (
	"encoding/json"
	"io"
	"net/http"
	"sync/atomic"
	"testing"
	"time"
	"github.com/mattermost/mattermost/server/public/model"
	"github.com/mattermost/mattermost/server/v8/channels/store"
	"github.com/mattermost/mattermost/server/v8/channels/store/sqlstore"
	"github.com/mattermost/mattermost/server/v8/platform/services/remotecluster"
	"github.com/mattermost/mattermost/server/v8/platform/services/sharedchannel"
	"github.com/stretchr/testify/require"
)
func writeOKResponse(w http.ResponseWriter) {
	response := &remotecluster.Response{
		Status: "OK",
		Err:    "",
	}
	syncResp := &model.SyncResponse{}
	_ = response.SetPayload(syncResp)
	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(http.StatusOK)
	respBytes, _ := json.Marshal(response)
	_, _ = w.Write(respBytes)
}
type SelfReferentialSyncHandler struct {
	t                *testing.T
	service          *sharedchannel.Service
	selfCluster      *model.RemoteCluster
	syncMessageCount *int32
	OnPostSync            func(post *model.Post)
	OnAcknowledgementSync func(ack *model.PostAcknowledgement)
}
func NewSelfReferentialSyncHandler(t *testing.T, service *sharedchannel.Service, selfCluster *model.RemoteCluster) *SelfReferentialSyncHandler {
	count := int32(0)
	return &SelfReferentialSyncHandler{
		t:                t,
		service:          service,
		selfCluster:      selfCluster,
		syncMessageCount: &count,
	}
}
func (h *SelfReferentialSyncHandler) HandleRequest(w http.ResponseWriter, r *http.Request) {
	switch r.URL.Path {
	case "/api/v4/remotecluster/msg":
		atomic.AddInt32(h.syncMessageCount, 1)
		body, _ := io.ReadAll(r.Body)
		var frame model.RemoteClusterFrame
		err := json.Unmarshal(body, &frame)
		if err == nil {
			response := &remotecluster.Response{}
			processErr := h.service.OnReceiveSyncMessageForTesting(frame.Msg, h.selfCluster, response)
			if processErr != nil {
				response.Status = "ERROR"
				response.Err = processErr.Error()
				h.t.Logf("Sync processing error: %v", processErr)
			} else {
				response.Status = "OK"
				response.Err = ""
				var syncMsg model.SyncMsg
				if unmarshalErr := json.Unmarshal(frame.Msg.Payload, &syncMsg); unmarshalErr == nil {
					if len(syncMsg.Posts) > 0 && h.OnPostSync != nil {
						for _, post := range syncMsg.Posts {
							h.OnPostSync(post)
						}
					}
					if len(syncMsg.Acknowledgements) > 0 && h.OnAcknowledgementSync != nil {
						for _, ack := range syncMsg.Acknowledgements {
							h.OnAcknowledgementSync(ack)
						}
					}
					syncResp := &model.SyncResponse{
						UsersSyncd: make([]string, 0),
					}
					_ = response.SetPayload(syncResp)
				}
			}
			w.Header().Set("Content-Type", "application/json")
			w.WriteHeader(http.StatusOK)
			respBytes, _ := json.Marshal(response)
			_, _ = w.Write(respBytes)
			return
		}
		writeOKResponse(w)
	case "/api/v4/remotecluster/ping":
		writeOKResponse(w)
	case "/api/v4/remotecluster/confirm_invite":
		writeOKResponse(w)
	default:
		writeOKResponse(w)
	}
}
func (h *SelfReferentialSyncHandler) GetSyncMessageCount() int32 {
	return atomic.LoadInt32(h.syncMessageCount)
}
func EnsureCleanState(t *testing.T, th *TestHelper, ss store.Store) {
	t.Helper()
	scsInterface := th.App.Srv().GetSharedChannelSyncService()
	if scsInterface != nil && scsInterface.Active() {
		if service, ok := scsInterface.(*sharedchannel.Service); ok {
			require.Eventually(t, func() bool {
				return !service.HasPendingTasksForTesting()
			}, 10*time.Second, 100*time.Millisecond, "All pending sync tasks should complete before cleanup")
		}
		_ = scsInterface.Shutdown()
		require.Eventually(t, func() bool {
			return !scsInterface.Active()
		}, 5*time.Second, 100*time.Millisecond, "Shared channel service should be inactive after shutdown")
	}
	allSharedChannels, _ := ss.SharedChannel().GetAll(0, 1000, model.SharedChannelFilterOpts{})
	for _, sc := range allSharedChannels {
		remotes, _ := ss.SharedChannel().GetRemotes(0, 100, model.SharedChannelRemoteFilterOpts{ChannelId: sc.ChannelId})
		for _, remote := range remotes {
			_, _ = ss.SharedChannel().DeleteRemote(remote.Id)
		}
		_, _ = ss.SharedChannel().Delete(sc.ChannelId)
	}
	allRemoteClusters, _ := ss.RemoteCluster().GetAll(0, 1000, model.RemoteClusterQueryFilter{})
	for _, rc := range allRemoteClusters {
		_, _ = ss.RemoteCluster().Delete(rc.RemoteId)
	}
	if sqlStore, ok := ss.(*sqlstore.SqlStore); ok {
		_, _ = sqlStore.GetMaster().Exec("UPDATE PostAcknowledgements SET AcknowledgedAt = 0")
	}
	channels, _ := ss.Channel().GetAll(th.BasicTeam.Id)
	for _, channel := range channels {
		if channel.Type != model.ChannelTypeDirect && channel.Type != model.ChannelTypeGroup &&
			channel.Id != th.BasicChannel.Id {
			members, _ := ss.Channel().GetMembers(model.ChannelMembersGetOptions{
				ChannelID: channel.Id,
			})
			for _, member := range members {
				_ = ss.Channel().RemoveMember(th.Context, channel.Id, member.UserId)
			}
		}
	}
	options := &model.UserGetOptions{
		Page:    0,
		PerPage: 200,
		Active:  true,
	}
	users, _ := ss.User().GetAllProfiles(options)
	for _, user := range users {
		if user.Id != th.BasicUser.Id && user.Id != th.BasicUser2.Id &&
			user.Id != th.SystemAdminUser.Id {
			user.DeleteAt = model.GetMillis()
			_, _ = ss.User().Update(th.Context, user, true)
		}
	}
	require.Eventually(t, func() bool {
		sharedChannels, _ := ss.SharedChannel().GetAll(0, 1000, model.SharedChannelFilterOpts{})
		remoteClusters, _ := ss.RemoteCluster().GetAll(0, 1000, model.RemoteClusterQueryFilter{})
		return len(sharedChannels) == 0 && len(remoteClusters) == 0
	}, 2*time.Second, 100*time.Millisecond, "Failed to clean up shared channels and remote clusters")
	if scsInterface != nil {
		_ = scsInterface.Start()
		if scs, ok := scsInterface.(*sharedchannel.Service); ok {
			require.Eventually(t, func() bool {
				return scs.Active()
			}, 5*time.Second, 100*time.Millisecond, "Shared channel service should be active after restart")
		}
	}
	rcService := th.App.Srv().GetRemoteClusterService()
	if rcService != nil {
		if rc, ok := rcService.(*remotecluster.Service); ok {
			rc.SetActive(true)
		}
		require.Eventually(t, func() bool {
			return rcService.Active()
		}, 5*time.Second, 100*time.Millisecond, "Remote cluster service should be active")
	}
}