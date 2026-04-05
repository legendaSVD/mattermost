package model
const (
	PluginClusterEventSendTypeReliable   = ClusterSendReliable
	PluginClusterEventSendTypeBestEffort = ClusterSendBestEffort
)
type PluginClusterEvent struct {
	Id string
	Data []byte
}
type PluginClusterEventSendOptions struct {
	SendType string
	TargetId string
}