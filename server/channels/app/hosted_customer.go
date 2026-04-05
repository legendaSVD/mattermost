package app
import (
	"github.com/mattermost/mattermost/server/public/model"
)
func (a *App) NotifySelfHostedSignupProgress(progress string, userId string) {
	if progress == "" || userId == "" {
		return
	}
	message := model.NewWebSocketEvent(model.WebsocketEventHostedCustomerSignupProgressUpdated, "", "", userId, nil, "")
	message.Add("progress", progress)
	a.Srv().Platform().Publish(message)
}