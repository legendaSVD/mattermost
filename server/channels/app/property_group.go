package app
import (
	"net/http"
	"github.com/mattermost/mattermost/server/public/model"
	"github.com/mattermost/mattermost/server/public/shared/request"
)
func (a *App) RegisterPropertyGroup(rctx request.CTX, name string) (*model.PropertyGroup, *model.AppError) {
	group, err := a.Srv().propertyService.RegisterPropertyGroup(name)
	if err != nil {
		return nil, model.NewAppError("RegisterPropertyGroup", "app.property.register_group.app_error", nil, "", http.StatusInternalServerError).Wrap(err)
	}
	return group, nil
}
func (a *App) GetPropertyGroup(rctx request.CTX, name string) (*model.PropertyGroup, *model.AppError) {
	group, err := a.Srv().propertyService.GetPropertyGroup(name)
	if err != nil {
		return nil, model.NewAppError("GetPropertyGroup", "app.property.get_group.app_error", nil, "", http.StatusInternalServerError).Wrap(err)
	}
	return group, nil
}