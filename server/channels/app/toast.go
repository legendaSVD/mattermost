package app
import (
	"net/http"
	"github.com/mattermost/mattermost/server/public/model"
)
func (a *App) SendToastMessage(userID, connectionID, message string, options model.SendToastMessageOptions) *model.AppError {
	if userID == "" {
		return model.NewAppError("SendToastMessage", "app.toast.send_toast_message.user_id.app_error", nil, "", http.StatusBadRequest)
	}
	if message == "" {
		return model.NewAppError("SendToastMessage", "app.toast.send_toast_message.message.app_error", nil, "", http.StatusBadRequest)
	}
	payload := map[string]any{
		"message":  message,
		"position": options.Position,
	}
	broadcast := &model.WebsocketBroadcast{
		UserId:       userID,
		ConnectionId: connectionID,
	}
	event := model.NewWebSocketEvent(model.WebsocketEventShowToast, "", "", userID, nil, "")
	event = event.SetBroadcast(broadcast).SetData(payload)
	a.Publish(event)
	return nil
}