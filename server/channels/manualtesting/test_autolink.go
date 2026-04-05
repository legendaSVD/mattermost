package manualtesting
import (
	"context"
	"errors"
	"net/http"
	"github.com/mattermost/mattermost/server/public/model"
	"github.com/mattermost/mattermost/server/public/shared/mlog"
)
const linkPostText = `
Some Links:
https:
https:
http:
https:
`
func testAutoLink(env TestEnvironment) *model.AppError {
	mlog.Info("Manual Auto Link Test")
	channelID, ok := getChannelID(env.Context.App, model.DefaultChannelName, env.CreatedTeamID, env.CreatedUserID)
	if !ok {
		return model.NewAppError("/manualtest", "manaultesting.test_autolink.unable.app_error", nil, "", http.StatusInternalServerError)
	}
	post := &model.Post{
		ChannelId: channelID,
		Message:   linkPostText}
	_, _, err := env.Client.CreatePost(context.Background(), post)
	var appErr *model.AppError
	if ok = errors.As(err, &appErr); !ok {
		appErr = model.NewAppError("/manualtest", "manaultesting.test_autolink.unable.app_error", nil, "", http.StatusInternalServerError)
	}
	return appErr
}