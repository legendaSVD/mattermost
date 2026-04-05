package pluginapi
import (
	"github.com/mattermost/mattermost/server/public/model"
	"github.com/mattermost/mattermost/server/public/plugin"
)
type ClusterService struct {
	api plugin.API
}
func (c *ClusterService) PublishPluginEvent(ev model.PluginClusterEvent, opts model.PluginClusterEventSendOptions) error {
	return c.api.PublishPluginClusterEvent(ev, opts)
}