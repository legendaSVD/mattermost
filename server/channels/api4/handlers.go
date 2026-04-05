package api4
import (
	"net/http"
	"github.com/klauspost/compress/gzhttp"
	"github.com/mattermost/mattermost/server/public/model"
	"github.com/mattermost/mattermost/server/public/shared/mlog"
	"github.com/mattermost/mattermost/server/v8/channels/app"
	"github.com/mattermost/mattermost/server/v8/channels/web"
)
type Context = web.Context
type handlerFunc func(*Context, http.ResponseWriter, *http.Request)
type APIHandlerOption string
const (
	handlerParamFileAPI = APIHandlerOption("fileAPI")
)
func (api *API) APIHandler(h handlerFunc, opts ...APIHandlerOption) http.Handler {
	handler := &web.Handler{
		Srv:            api.srv,
		HandleFunc:     h,
		HandlerName:    web.GetHandlerName(h),
		RequireSession: false,
		TrustRequester: false,
		RequireMfa:     false,
		IsStatic:       false,
		IsLocal:        false,
	}
	setHandlerOpts(handler, opts...)
	if *api.srv.Config().ServiceSettings.WebserverMode == "gzip" {
		return gzhttp.GzipHandler(handler)
	}
	return handler
}
func (api *API) APISessionRequired(h handlerFunc, opts ...APIHandlerOption) http.Handler {
	handler := &web.Handler{
		Srv:            api.srv,
		HandleFunc:     h,
		HandlerName:    web.GetHandlerName(h),
		RequireSession: true,
		TrustRequester: false,
		RequireMfa:     true,
		IsStatic:       false,
		IsLocal:        false,
	}
	setHandlerOpts(handler, opts...)
	if *api.srv.Config().ServiceSettings.WebserverMode == "gzip" {
		return gzhttp.GzipHandler(handler)
	}
	return handler
}
func (api *API) CloudAPIKeyRequired(h handlerFunc, opts ...APIHandlerOption) http.Handler {
	handler := &web.Handler{
		Srv:             api.srv,
		HandleFunc:      h,
		HandlerName:     web.GetHandlerName(h),
		RequireSession:  false,
		RequireCloudKey: true,
		TrustRequester:  false,
		RequireMfa:      false,
		IsStatic:        false,
		IsLocal:         false,
	}
	setHandlerOpts(handler, opts...)
	if *api.srv.Config().ServiceSettings.WebserverMode == "gzip" {
		return gzhttp.GzipHandler(handler)
	}
	return handler
}
func (api *API) RemoteClusterTokenRequired(h handlerFunc, opts ...APIHandlerOption) http.Handler {
	handler := &web.Handler{
		Srv:                       api.srv,
		HandleFunc:                h,
		HandlerName:               web.GetHandlerName(h),
		RequireSession:            false,
		RequireCloudKey:           false,
		RequireRemoteClusterToken: true,
		TrustRequester:            false,
		RequireMfa:                false,
		IsStatic:                  false,
		IsLocal:                   false,
	}
	setHandlerOpts(handler, opts...)
	if *api.srv.Config().ServiceSettings.WebserverMode == "gzip" {
		return gzhttp.GzipHandler(handler)
	}
	return handler
}
func (api *API) APISessionRequiredMfa(h handlerFunc, opts ...APIHandlerOption) http.Handler {
	handler := &web.Handler{
		Srv:            api.srv,
		HandleFunc:     h,
		HandlerName:    web.GetHandlerName(h),
		RequireSession: true,
		TrustRequester: false,
		RequireMfa:     false,
		IsStatic:       false,
		IsLocal:        false,
	}
	setHandlerOpts(handler, opts...)
	if *api.srv.Config().ServiceSettings.WebserverMode == "gzip" {
		return gzhttp.GzipHandler(handler)
	}
	return handler
}
func (api *API) APIHandlerTrustRequester(h handlerFunc, opts ...APIHandlerOption) http.Handler {
	handler := &web.Handler{
		Srv:            api.srv,
		HandleFunc:     h,
		HandlerName:    web.GetHandlerName(h),
		RequireSession: false,
		TrustRequester: true,
		RequireMfa:     false,
		IsStatic:       false,
		IsLocal:        false,
	}
	setHandlerOpts(handler, opts...)
	if *api.srv.Config().ServiceSettings.WebserverMode == "gzip" {
		return gzhttp.GzipHandler(handler)
	}
	return handler
}
func (api *API) APISessionRequiredTrustRequester(h handlerFunc, opts ...APIHandlerOption) http.Handler {
	handler := &web.Handler{
		Srv:            api.srv,
		HandleFunc:     h,
		HandlerName:    web.GetHandlerName(h),
		RequireSession: true,
		TrustRequester: true,
		RequireMfa:     true,
		IsStatic:       false,
		IsLocal:        false,
	}
	setHandlerOpts(handler, opts...)
	if *api.srv.Config().ServiceSettings.WebserverMode == "gzip" {
		return gzhttp.GzipHandler(handler)
	}
	return handler
}
func (api *API) APISessionRequiredDisableWhenBusy(h handlerFunc, opts ...APIHandlerOption) http.Handler {
	handler := &web.Handler{
		Srv:             api.srv,
		HandleFunc:      h,
		HandlerName:     web.GetHandlerName(h),
		RequireSession:  true,
		TrustRequester:  false,
		RequireMfa:      true,
		IsStatic:        false,
		IsLocal:         false,
		DisableWhenBusy: true,
	}
	setHandlerOpts(handler, opts...)
	if *api.srv.Config().ServiceSettings.WebserverMode == "gzip" {
		return gzhttp.GzipHandler(handler)
	}
	return handler
}
func (api *API) APILocal(h handlerFunc, opts ...APIHandlerOption) http.Handler {
	handler := &web.Handler{
		Srv:            api.srv,
		HandleFunc:     h,
		HandlerName:    web.GetHandlerName(h),
		RequireSession: false,
		TrustRequester: false,
		RequireMfa:     false,
		IsStatic:       false,
		IsLocal:        true,
	}
	setHandlerOpts(handler, opts...)
	if *api.srv.Config().ServiceSettings.WebserverMode == "gzip" {
		return gzhttp.GzipHandler(handler)
	}
	return handler
}
func (api *API) RateLimitedHandler(apiHandler http.Handler, settings model.RateLimitSettings) http.Handler {
	if !*api.srv.Config().RateLimitSettings.Enable {
		return apiHandler
	}
	settings.SetDefaults()
	rateLimiter, err := app.NewRateLimiter(&settings, []string{})
	if err != nil {
		api.srv.Log().Error("getRateLimitedHandler", mlog.Err(err))
		return nil
	}
	return rateLimiter.RateLimitHandler(apiHandler)
}
func requireLicense(c *Context) *model.AppError {
	if c.App.Channels().License() == nil {
		err := model.NewAppError("", "api.license_error", nil, "", http.StatusNotImplemented)
		return err
	}
	return nil
}
func setHandlerOpts(handler *web.Handler, opts ...APIHandlerOption) {
	if len(opts) == 0 {
		return
	}
	for _, option := range opts {
		switch option {
		case handlerParamFileAPI:
			handler.FileAPI = true
		}
	}
}