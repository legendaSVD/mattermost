package app
import (
	"net/http"
	"github.com/mattermost/mattermost/server/public/model"
)
func (a *App) ReattachPlugin(manifest *model.Manifest, pluginReattachConfig *model.PluginReattachConfig) *model.AppError {
	return a.ch.ReattachPlugin(manifest, pluginReattachConfig)
}
func (ch *Channels) ReattachPlugin(manifest *model.Manifest, pluginReattachConfig *model.PluginReattachConfig) *model.AppError {
	pluginsEnvironment := ch.GetPluginsEnvironment()
	if pluginsEnvironment == nil {
		return model.NewAppError("ReattachPlugin", "app.plugin.disabled.app_error", nil, "", http.StatusNotImplemented)
	}
	appErr := ch.DetachPlugin(manifest.Id)
	if appErr != nil {
		return appErr
	}
	if err := pluginsEnvironment.Reattach(manifest, pluginReattachConfig); err != nil {
		return model.NewAppError("ReattachPlugin", "app.plugin.reattach.app_error", nil, "", http.StatusInternalServerError).Wrap(err)
	}
	return nil
}
func (a *App) DetachPlugin(pluginId string) *model.AppError {
	return a.ch.DetachPlugin(pluginId)
}
func (ch *Channels) DetachPlugin(pluginID string) *model.AppError {
	pluginsEnvironment := ch.GetPluginsEnvironment()
	if pluginsEnvironment == nil {
		return model.NewAppError("DetachPlugin", "app.plugin.disabled.app_error", nil, "", http.StatusNotImplemented)
	}
	pluginsEnvironment.Deactivate(pluginID)
	pluginsEnvironment.RemovePlugin(pluginID)
	return nil
}