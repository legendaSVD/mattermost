package web
import (
	"bytes"
	"context"
	"errors"
	"fmt"
	"net/http"
	"reflect"
	"runtime"
	"strconv"
	"strings"
	"time"
	"github.com/klauspost/compress/gzhttp"
	"github.com/mattermost/mattermost/server/public/model"
	"github.com/mattermost/mattermost/server/public/shared/i18n"
	"github.com/mattermost/mattermost/server/public/shared/mlog"
	"github.com/mattermost/mattermost/server/public/shared/request"
	"github.com/mattermost/mattermost/server/v8/channels/app"
	"github.com/mattermost/mattermost/server/v8/channels/utils"
)
func GetHandlerName(h func(*Context, http.ResponseWriter, *http.Request)) string {
	handlerName := runtime.FuncForPC(reflect.ValueOf(h).Pointer()).Name()
	pos := strings.LastIndex(handlerName, ".")
	if pos != -1 && len(handlerName) > pos {
		handlerName = handlerName[pos+1:]
	}
	return handlerName
}
func (w *Web) NewHandler(h func(*Context, http.ResponseWriter, *http.Request)) http.Handler {
	return &Handler{
		Srv:            w.srv,
		HandleFunc:     h,
		HandlerName:    GetHandlerName(h),
		RequireSession: false,
		TrustRequester: false,
		RequireMfa:     false,
		IsStatic:       false,
		IsLocal:        false,
	}
}
func (w *Web) NewStaticHandler(h func(*Context, http.ResponseWriter, *http.Request)) http.Handler {
	subpath, _ := utils.GetSubpathFromConfig(w.srv.Config())
	return &Handler{
		Srv:            w.srv,
		HandleFunc:     h,
		HandlerName:    GetHandlerName(h),
		RequireSession: false,
		TrustRequester: false,
		RequireMfa:     false,
		IsStatic:       true,
		cspShaDirective: utils.GetSubpathScriptHash(subpath),
	}
}
type Handler struct {
	Srv                       *app.Server
	HandleFunc                func(*Context, http.ResponseWriter, *http.Request)
	HandlerName               string
	RequireSession            bool
	RequireCloudKey           bool
	RequireRemoteClusterToken bool
	TrustRequester            bool
	RequireMfa                bool
	IsStatic                  bool
	IsLocal                   bool
	DisableWhenBusy           bool
	FileAPI                   bool
	cspShaDirective string
}
func generateDevCSP(c Context) string {
	var devCSP []string
	if model.BuildNumber == "dev" {
		devCSP = append(devCSP, "'unsafe-eval'")
	}
	if model.BuildNumber == "dev" {
		devCSP = append(devCSP, "'unsafe-inline'")
	}
	if *c.App.Config().ServiceSettings.DeveloperFlags != "" {
		for devFlagKVStr := range strings.SplitSeq(*c.App.Config().ServiceSettings.DeveloperFlags, ",") {
			devFlagKVSplit := strings.SplitN(devFlagKVStr, "=", 2)
			if len(devFlagKVSplit) != 2 {
				c.Logger.Warn("Unable to parse developer flag", mlog.String("developer_flag", devFlagKVStr))
				continue
			}
			devFlagKey := devFlagKVSplit[0]
			devFlagValue := devFlagKVSplit[1]
			if devFlagValue != "true" {
				continue
			}
			switch devFlagKey {
			case "unsafe-eval", "unsafe-inline":
				if model.BuildNumber == "dev" {
					continue
				}
				devCSP = append(devCSP, "'"+devFlagKey+"'")
			default:
				c.Logger.Warn("Unrecognized developer flag", mlog.String("developer_flag", devFlagKVStr))
			}
		}
	}
	if len(devCSP) == 0 {
		return ""
	}
	return " " + strings.Join(devCSP, " ")
}
func (h Handler) basicSecurityChecks(c *Context, w http.ResponseWriter, r *http.Request) {
	maxURLCharacters := *c.App.Config().ServiceSettings.MaximumURLLength
	if len(r.RequestURI) > maxURLCharacters {
		c.Err = model.NewAppError("basicSecurityChecks", "basic_security_check.url.too_long_error", nil, "", http.StatusRequestURITooLong)
		return
	}
}
func (h Handler) ServeHTTP(w http.ResponseWriter, r *http.Request) {
	w = newWrappedWriter(w)
	now := time.Now()
	appInstance := app.New(app.ServerConnector(h.Srv.Channels()))
	c := &Context{
		AppContext: &request.Context{},
		App:        appInstance,
	}
	requestID := model.NewId()
	var rateLimitExceeded bool
	defer func() {
		responseLogFields := []mlog.Field{
			mlog.String("method", r.Method),
			mlog.String("url", r.URL.Path),
			mlog.String("request_id", requestID),
		}
		if c.AppContext.Session() != nil && c.AppContext.Session().UserId != "" {
			responseLogFields = append(responseLogFields, mlog.String("user_id", c.AppContext.Session().UserId))
		}
		statusCode := strconv.Itoa(w.(*responseWriterWrapper).StatusCode())
		if statusCode != "0" {
			responseLogFields = append(responseLogFields, mlog.String("status_code", statusCode))
		}
		mlog.Debug("Received HTTP request", responseLogFields...)
		if !rateLimitExceeded {
			h.recordMetrics(c, r, now, statusCode)
		}
	}()
	t, _ := i18n.GetTranslationsAndLocaleFromRequest(r)
	c.AppContext = request.NewContext(
		context.Background(),
		requestID,
		utils.GetIPAddress(r, c.App.Config().ServiceSettings.TrustedProxyIPHeader),
		r.Header.Get("X-Forwarded-For"),
		r.URL.Path,
		r.UserAgent(),
		r.Header.Get("Accept-Language"),
		t,
	)
	c.Params = ParamsFromRequest(r)
	c.Logger = c.App.Log()
	h.basicSecurityChecks(c, w, r)
	if c.Err != nil {
		h.handleContextError(c, w, r)
		return
	}
	var maxBytes int64
	if h.FileAPI {
		maxBytes = *c.App.Config().FileSettings.MaxFileSize + bytes.MinRead
	} else {
		maxBytes = *c.App.Config().ServiceSettings.MaximumPayloadSizeBytes + bytes.MinRead
	}
	r.Body = http.MaxBytesReader(w, r.Body, maxBytes)
	subpath, _ := utils.GetSubpathFromConfig(c.App.Config())
	siteURLHeader := app.GetProtocol(r) + "://" + r.Host + subpath
	if c.App.Channels().License().IsCloud() {
		siteURLHeader = *c.App.Config().ServiceSettings.SiteURL + subpath
	}
	c.SetSiteURLHeader(siteURLHeader)
	w.Header().Set(model.HeaderRequestId, c.AppContext.RequestId())
	w.Header().Set(model.HeaderVersionId, fmt.Sprintf("%v.%v.%v.%v", model.CurrentVersion, model.BuildNumber, c.App.ClientConfigHash(), c.App.Channels().License() != nil))
	if *c.App.Config().ServiceSettings.TLSStrictTransport {
		w.Header().Set("Strict-Transport-Security", fmt.Sprintf("max-age=%d", *c.App.Config().ServiceSettings.TLSStrictTransportMaxAge))
	}
	w.Header().Set("Permissions-Policy", "")
	w.Header().Set("X-Content-Type-Options", "nosniff")
	w.Header().Set("Referrer-Policy", "no-referrer")
	if h.IsStatic {
		w.Header().Set("X-Frame-Options", "SAMEORIGIN")
		devCSP := generateDevCSP(*c)
		w.Header().Set("Content-Security-Policy", fmt.Sprintf(
			"frame-ancestors 'self' %s; script-src 'self'%s%s",
			*c.App.Config().ServiceSettings.FrameAncestors,
			h.cspShaDirective,
			devCSP,
		))
	} else {
		w.Header().Set("Content-Type", "application/json")
		if r.Method == "GET" {
			w.Header().Set("Expires", "0")
		}
	}
	token, tokenLocation := app.ParseAuthTokenFromRequest(r)
	if token != "" && tokenLocation != app.TokenLocationCloudHeader && tokenLocation != app.TokenLocationRemoteClusterHeader {
		session, err := c.App.GetSession(token)
		if err != nil {
			c.Logger.Info("Invalid session", mlog.Err(err))
			if err.StatusCode == http.StatusInternalServerError {
				c.Err = err
			} else if h.RequireSession {
				c.RemoveSessionCookie(w, r)
				c.Err = model.NewAppError("ServeHTTP", "api.context.session_expired.app_error", nil, "token="+token, http.StatusUnauthorized)
			}
		} else if !session.IsOAuth && tokenLocation == app.TokenLocationQueryString {
			c.Err = model.NewAppError("ServeHTTP", "api.context.token_provided.app_error", nil, "token="+token, http.StatusUnauthorized)
		} else {
			c.AppContext = c.AppContext.WithSession(session)
		}
		if c.App.Srv().RateLimiter != nil {
			rateLimitExceeded = c.App.Srv().RateLimiter.UserIdRateLimit(r.Context(), c.AppContext.Session().UserId, w)
			if rateLimitExceeded {
				return
			}
		}
		csrfChecked, csrfPassed := h.checkCSRFToken(c, r, tokenLocation, session)
		if csrfChecked && !csrfPassed {
			c.AppContext = c.AppContext.WithSession(&model.Session{})
			c.RemoveSessionCookie(w, r)
			c.Err = model.NewAppError("ServeHTTP", "api.context.session_expired.app_error", nil, "token="+token+" Appears to be a CSRF attempt", http.StatusUnauthorized)
		}
	} else if token != "" && c.App.Channels().License().IsCloud() && tokenLocation == app.TokenLocationCloudHeader {
		session, err := c.App.GetCloudSession(token)
		if err != nil {
			c.Logger.Warn("Invalid CWS token", mlog.Err(err))
			c.Err = err
		} else {
			c.AppContext = c.AppContext.WithSession(session)
		}
	} else if token != "" && c.App.Channels().License() != nil && c.App.Channels().License().HasRemoteClusterService() && tokenLocation == app.TokenLocationRemoteClusterHeader {
		if remoteId := c.GetRemoteID(r); remoteId == "" {
			c.Logger.Warn("Missing remote cluster id")
			c.Err = model.NewAppError("ServeHTTP", "api.context.remote_id_missing.app_error", nil, "", http.StatusUnauthorized)
		} else {
			session, err := c.App.GetRemoteClusterSession(token, remoteId)
			if err != nil {
				c.Logger.Warn("Invalid remote cluster token", mlog.Err(err))
				c.Err = err
			} else {
				c.AppContext = c.AppContext.WithSession(session)
			}
		}
	}
	c.Logger = c.App.Log().With(
		mlog.String("path", c.AppContext.Path()),
		mlog.String("request_id", c.AppContext.RequestId()),
		mlog.String("ip_addr", c.AppContext.IPAddress()),
		mlog.String("user_id", c.AppContext.Session().UserId),
		mlog.String("method", r.Method),
	)
	c.AppContext = c.AppContext.WithLogger(c.Logger)
	if c.Err == nil && h.RequireSession {
		c.SessionRequired()
	}
	if c.Err == nil && h.RequireMfa {
		c.MfaRequired()
	}
	if c.Err == nil && h.DisableWhenBusy && c.App.Srv().Platform().Busy.IsBusy() {
		c.SetServerBusyError()
	}
	if c.Err == nil && h.RequireCloudKey {
		c.CloudKeyRequired()
	}
	if c.Err == nil && h.RequireRemoteClusterToken {
		c.RemoteClusterTokenRequired()
	}
	if c.Err == nil && h.IsLocal {
		isLocalOrigin := !strings.Contains(r.RemoteAddr, ":")
		if *c.App.Config().ServiceSettings.EnableLocalMode && isLocalOrigin {
			c.AppContext = c.AppContext.WithSession(&model.Session{Local: true})
		} else if !isLocalOrigin {
			c.Err = model.NewAppError("", "api.context.local_origin_required.app_error", nil, "LocalOriginRequired", http.StatusUnauthorized)
		}
	}
	if c.Err == nil {
		h.HandleFunc(c, w, r)
	}
	if c.Err != nil {
		h.handleContextError(c, w, r)
		return
	}
}
func (h Handler) recordMetrics(c *Context, r *http.Request, now time.Time, statusCode string) {
	if c.App.Metrics() != nil {
		c.App.Metrics().IncrementHTTPRequest()
		if r.URL.Path != model.APIURLSuffix+"/websocket" {
			elapsed := float64(time.Since(now)) / float64(time.Second)
			pageLoadContext := r.Header.Get("X-Page-Load-Context")
			if pageLoadContext != "page_load" && pageLoadContext != "reconnect" {
				pageLoadContext = ""
			}
			c.App.Metrics().ObserveAPIEndpointDuration(h.HandlerName, r.Method, statusCode, string(GetOriginClient(r)), pageLoadContext, elapsed)
		}
	}
}
func (h Handler) handleContextError(c *Context, w http.ResponseWriter, r *http.Request) {
	if c.Err == nil {
		return
	}
	var maxBytesErr *http.MaxBytesError
	if ok := errors.As(c.Err, &maxBytesErr); ok {
		newErr := model.NewAppError(c.Err.Where, "api.context.request_body_too_large.app_error", nil, "Use the setting `MaximumPayloadSizeBytes` in Mattermost config to configure allowed payload limit. Learn more about this setting in Mattermost docs at https://docs.mattermost.com/configure/environment-configuration-settings.html#maximum-payload-size", http.StatusRequestEntityTooLarge)
		c.Err = newErr
	}
	if c.Err.StatusCode == 0 {
		c.Logger.Error("AppError with zero StatusCode detected",
			mlog.String("error_id", c.Err.Id),
			mlog.String("error_message", c.Err.Message),
			mlog.String("error_where", c.Err.Where),
			mlog.String("request_path", r.URL.Path),
			mlog.String("request_method", r.Method),
			mlog.String("detailed_error", c.Err.DetailedError),
		)
		c.Err.StatusCode = http.StatusInternalServerError
	}
	c.Err.RequestId = c.AppContext.RequestId()
	c.LogErrorByCode(c.Err)
	c.Err.Translate(c.AppContext.T)
	c.Err.Where = r.URL.Path
	if !*c.App.Config().ServiceSettings.EnableDeveloper {
		c.Err.WipeDetailed()
	}
	if *c.App.Config().ServiceSettings.ExperimentalEnableHardenedMode && c.Err.StatusCode >= 500 {
		c.Err.Id = ""
		c.Err.Message = "Internal Server Error"
		c.Err.WipeDetailed()
		c.Err.StatusCode = 500
		c.Err.Where = ""
	}
	if IsAPICall(c.App, r) || IsWebhookCall(c.App, r) || IsOAuthAPICall(c.App, r) || r.Header.Get("X-Mobile-App") != "" {
		w.Header().Set("Content-Type", "application/json")
		w.WriteHeader(c.Err.StatusCode)
		if _, err := w.Write([]byte(c.Err.ToJSON())); err != nil {
			c.Logger.Warn("Failed to write error response", mlog.Err(err))
		}
	} else {
		utils.RenderWebAppError(c.App.Config(), w, r, c.Err, c.App.AsymmetricSigningKey())
	}
	if c.App.Metrics() != nil {
		c.App.Metrics().IncrementHTTPError()
	}
}
type OriginClient string
const (
	OriginClientUnknown OriginClient = "unknown"
	OriginClientWeb     OriginClient = "web"
	OriginClientMobile  OriginClient = "mobile"
	OriginClientDesktop OriginClient = "desktop"
)
func GetOriginClient(r *http.Request) OriginClient {
	userAgent := r.Header.Get("User-Agent")
	fields := strings.Fields(userAgent)
	if len(fields) < 1 {
		return OriginClientUnknown
	}
	queryParam := r.URL.Query().Get("mobilev2")
	if queryParam == "true" {
		return OriginClientMobile
	}
	clientAgent := fields[0]
	if strings.HasPrefix(clientAgent, "rnbeta") || strings.HasPrefix(clientAgent, "Mattermost") {
		return OriginClientMobile
	}
	if strings.HasPrefix(fields[len(fields)-1], "Mattermost") {
		return OriginClientDesktop
	}
	return OriginClientWeb
}
func (h *Handler) checkCSRFToken(c *Context, r *http.Request, tokenLocation app.TokenLocation, session *model.Session) (checked bool, passed bool) {
	csrfCheckNeeded := session != nil && c.Err == nil && tokenLocation == app.TokenLocationCookie && !h.TrustRequester && r.Method != "GET"
	csrfCheckPassed := false
	if csrfCheckNeeded {
		csrfHeader := r.Header.Get(model.HeaderCsrfToken)
		if csrfHeader == session.GetCSRF() {
			csrfCheckPassed = true
		} else if r.Header.Get(model.HeaderRequestedWith) == model.HeaderRequestedWithXML {
			csrfErrorMessage := "CSRF Header check failed for request - Please upgrade your web application or custom app to set a CSRF Header"
			fields := []mlog.Field{
				mlog.String("path", r.URL.Path),
				mlog.String("ip", r.RemoteAddr),
				mlog.String("session_id", session.Id),
				mlog.String("user_id", session.UserId),
			}
			if *c.App.Config().ServiceSettings.ExperimentalStrictCSRFEnforcement {
				c.Logger.Warn(csrfErrorMessage, fields...)
			} else {
				c.Logger.Debug(csrfErrorMessage, fields...)
				csrfCheckPassed = true
			}
		}
	}
	return csrfCheckNeeded, csrfCheckPassed
}
func (w *Web) APIHandler(h func(*Context, http.ResponseWriter, *http.Request)) http.Handler {
	handler := &Handler{
		Srv:            w.srv,
		HandleFunc:     h,
		HandlerName:    GetHandlerName(h),
		RequireSession: false,
		TrustRequester: false,
		RequireMfa:     false,
		IsStatic:       false,
		IsLocal:        false,
	}
	if *w.srv.Config().ServiceSettings.WebserverMode == "gzip" {
		return gzhttp.GzipHandler(handler)
	}
	return handler
}
func (w *Web) APIHandlerTrustRequester(h func(*Context, http.ResponseWriter, *http.Request)) http.Handler {
	handler := &Handler{
		Srv:            w.srv,
		HandleFunc:     h,
		HandlerName:    GetHandlerName(h),
		RequireSession: false,
		TrustRequester: true,
		RequireMfa:     false,
		IsStatic:       false,
		IsLocal:        false,
	}
	if *w.srv.Config().ServiceSettings.WebserverMode == "gzip" {
		return gzhttp.GzipHandler(handler)
	}
	return handler
}
func (w *Web) APISessionRequired(h func(*Context, http.ResponseWriter, *http.Request)) http.Handler {
	handler := &Handler{
		Srv:            w.srv,
		HandleFunc:     h,
		HandlerName:    GetHandlerName(h),
		RequireSession: true,
		TrustRequester: false,
		RequireMfa:     true,
		IsStatic:       false,
		IsLocal:        false,
	}
	if *w.srv.Config().ServiceSettings.WebserverMode == "gzip" {
		return gzhttp.GzipHandler(handler)
	}
	return handler
}