package app
import (
	"bytes"
	"io"
	"net/http"
	"path"
	"path/filepath"
	"strings"
	"github.com/gorilla/mux"
	"github.com/mattermost/mattermost/server/public/model"
	"github.com/mattermost/mattermost/server/public/plugin"
	"github.com/mattermost/mattermost/server/public/shared/mlog"
	"github.com/mattermost/mattermost/server/public/shared/request"
	"github.com/mattermost/mattermost/server/v8/channels/utils"
)
func (ch *Channels) ServePluginRequest(w http.ResponseWriter, r *http.Request) {
	params := mux.Vars(r)
	pluginID := params["plugin_id"]
	pluginsEnvironment := ch.GetPluginsEnvironment()
	if pluginsEnvironment == nil {
		appErr := model.NewAppError("ServePluginRequest", "app.plugin.disabled.app_error", nil, "Enable plugins to serve plugin requests", http.StatusNotImplemented)
		mlog.Error(appErr.Error())
		w.WriteHeader(appErr.StatusCode)
		w.Header().Set("Content-Type", "application/json")
		if _, err := w.Write([]byte(appErr.ToJSON())); err != nil {
			mlog.Warn("Error while writing response", mlog.Err(err))
		}
		return
	}
	hooks, err := pluginsEnvironment.HooksForPlugin(pluginID)
	if err != nil {
		mlog.Debug("Access to route for non-existent plugin",
			mlog.String("missing_plugin_id", pluginID),
			mlog.String("url", r.URL.String()),
			mlog.Err(err))
		http.NotFound(w, r)
		return
	}
	ch.servePluginRequest(w, r, hooks.ServeHTTP)
}
func (a *App) ServeInternalPluginRequest(userID string, w http.ResponseWriter, r *http.Request, sourcePluginID, targetPluginID string) {
	pluginsEnvironment := a.ch.GetPluginsEnvironment()
	if pluginsEnvironment == nil {
		appErr := model.NewAppError("ServeInternalPluginRequest", "app.plugin.disabled.app_error", nil, "Plugin environment not found.", http.StatusNotImplemented)
		a.Log().Error(appErr.Error())
		w.WriteHeader(appErr.StatusCode)
		w.Header().Set("Content-Type", "application/json")
		if _, err := w.Write([]byte(appErr.ToJSON())); err != nil {
			mlog.Warn("Error while writing response", mlog.Err(err))
		}
		return
	}
	hooks, err := pluginsEnvironment.HooksForPlugin(targetPluginID)
	if err != nil {
		a.Log().Error("Access to route for non-existent plugin in internal plugin request",
			mlog.String("source_plugin_id", sourcePluginID),
			mlog.String("target_plugin_id", targetPluginID),
			mlog.String("url", r.URL.String()),
			mlog.Err(err),
		)
		http.NotFound(w, r)
		return
	}
	context := &plugin.Context{
		RequestId: model.NewId(),
		UserAgent: r.UserAgent(),
	}
	r.Header.Set("Mattermost-User-Id", userID)
	if sourcePluginID != "" {
		r.Header.Set("Mattermost-Plugin-ID", sourcePluginID)
	} else {
		r.Header.Set("Mattermost-Plugin-ID", "com.mattermost.server")
	}
	hooks.ServeHTTP(context, w, r)
}
func (a *App) ServeInterPluginRequest(w http.ResponseWriter, r *http.Request, sourcePluginId, destinationPluginId string) {
	a.ServeInternalPluginRequest("", w, r, sourcePluginId, destinationPluginId)
}
func (ch *Channels) ServePluginPublicRequest(w http.ResponseWriter, r *http.Request) {
	if strings.HasSuffix(r.URL.Path, "/") {
		http.NotFound(w, r)
		return
	}