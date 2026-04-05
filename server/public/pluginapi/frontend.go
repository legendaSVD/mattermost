package pluginapi
import (
	"github.com/mattermost/mattermost/server/public/model"
	"github.com/mattermost/mattermost/server/public/plugin"
)
type FrontendService struct {
	api plugin.API
}
func (f *FrontendService) OpenInteractiveDialog(dialog model.OpenDialogRequest) error {
	return normalizeAppErr(f.api.OpenInteractiveDialog(dialog))
}
func (f *FrontendService) PublishWebSocketEvent(event string, payload map[string]any, broadcast *model.WebsocketBroadcast) {
	f.api.PublishWebSocketEvent(event, payload, broadcast)
}
func (f *FrontendService) SendToastMessage(userID, connectionID, message string, options model.SendToastMessageOptions) error {
	return normalizeAppErr(f.api.SendToastMessage(userID, connectionID, message, options))
}