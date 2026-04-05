package app
import (
	"net/http"
	"github.com/mattermost/mattermost/server/public/model"
	"github.com/mattermost/mattermost/server/public/shared/mlog"
)
func (a *App) GenerateAndSaveDesktopToken(createAt int64, user *model.User) (*string, *model.AppError) {
	token := model.NewRandomString(64)
	err := a.Srv().Store().DesktopTokens().Insert(token, createAt, user.Id)
	if err != nil {
		if deleteErr := a.Srv().Store().DesktopTokens().DeleteByUserId(user.Id); deleteErr != nil {
			a.Log().Error("Unable to delete desktop token", mlog.Err(deleteErr))
		}
		return nil, model.NewAppError("GenerateAndSaveDesktopToken", "app.desktop_token.generateServerToken.invalid_or_expired", nil, "", http.StatusBadRequest).Wrap(err)
	}
	return &token, nil
}
func (a *App) ValidateDesktopToken(token string, expiryTime int64) (*model.User, *model.AppError) {
	userId, err := a.Srv().Store().DesktopTokens().GetUserId(token, expiryTime)
	if err != nil {
		if deleteErr := a.Srv().Store().DesktopTokens().Delete(token); deleteErr != nil {
			a.Log().Error("Unable to delete desktop token", mlog.Err(deleteErr))
		}
		return nil, model.NewAppError("ValidateDesktopToken", "app.desktop_token.validate.invalid", nil, "", http.StatusUnauthorized).Wrap(err)
	}
	user, userErr := a.GetUser(*userId)
	if userErr != nil {
		if deleteErr := a.Srv().Store().DesktopTokens().Delete(token); deleteErr != nil {
			a.Log().Error("Unable to delete desktop token", mlog.Err(deleteErr))
		}
		return nil, model.NewAppError("ValidateDesktopToken", "app.desktop_token.validate.no_user", nil, "", http.StatusInternalServerError).Wrap(userErr)
	}
	if deleteErr := a.Srv().Store().DesktopTokens().DeleteByUserId(*userId); deleteErr != nil {
		a.Log().Error("Unable to delete desktop token", mlog.Err(deleteErr))
	}
	return user, nil
}