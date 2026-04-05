package pluginapi
import (
	"github.com/mattermost/mattermost/server/public/model"
	"github.com/mattermost/mattermost/server/public/plugin"
)
type OAuthService struct {
	api plugin.API
}
func (o *OAuthService) Create(app *model.OAuthApp) error {
	createdApp, appErr := o.api.CreateOAuthApp(app)
	if appErr != nil {
		return normalizeAppErr(appErr)
	}
	*app = *createdApp
	return nil
}
func (o *OAuthService) Get(appID string) (*model.OAuthApp, error) {
	app, appErr := o.api.GetOAuthApp(appID)
	return app, normalizeAppErr(appErr)
}
func (o *OAuthService) Update(app *model.OAuthApp) error {
	updatedApp, appErr := o.api.UpdateOAuthApp(app)
	if appErr != nil {
		return normalizeAppErr(appErr)
	}
	*app = *updatedApp
	return nil
}
func (o *OAuthService) Delete(appID string) error {
	return normalizeAppErr(o.api.DeleteOAuthApp(appID))
}