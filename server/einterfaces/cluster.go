package einterfaces
import (
	"github.com/mattermost/mattermost/server/public/model"
	"github.com/mattermost/mattermost/server/public/shared/request"
)
type ClusterMessageHandler func(msg *model.ClusterMessage)
type ClusterInterface interface {
	StartInterNodeCommunication()
	StopInterNodeCommunication()
	RegisterClusterMessageHandler(event model.ClusterEvent, crm ClusterMessageHandler)
	GetClusterId() string
	IsLeader() bool
	HealthScore() int
	GetMyClusterInfo() *model.ClusterInfo
	GetClusterInfos() ([]*model.ClusterInfo, error)
	SendClusterMessage(msg *model.ClusterMessage)
	SendClusterMessageToNode(nodeID string, msg *model.ClusterMessage) error
	NotifyMsg(buf []byte)
	GetClusterStats(rctx request.CTX) ([]*model.ClusterStats, *model.AppError)
	GetLogs(rctx request.CTX, page, perPage int) ([]string, *model.AppError)
	QueryLogs(rctx request.CTX, page, perPage int) (map[string][]string, *model.AppError)
	GenerateSupportPacket(rctx request.CTX, options *model.SupportPacketOptions) (map[string][]model.FileData, error)
	GetPluginStatuses() (model.PluginStatuses, *model.AppError)
	ConfigChanged(previousConfig *model.Config, newConfig *model.Config, sendToOtherServer bool) *model.AppError
	WebConnCountForUser(userID string) (int, *model.AppError)
	GetWSQueues(userID, connectionID string, seqNum int64) (map[string]*model.WSQueues, error)
}