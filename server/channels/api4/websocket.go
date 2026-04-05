package api4
import (
	"net/http"
	"strconv"
	"github.com/gorilla/websocket"
	"github.com/mattermost/mattermost/server/public/model"
	"github.com/mattermost/mattermost/server/public/shared/mlog"
	"github.com/mattermost/mattermost/server/v8/channels/app/platform"
	"github.com/mattermost/mattermost/server/v8/channels/web"
)
const (
	connectionIDParam      = "connection_id"
	sequenceNumberParam    = "sequence_number"
	postedAckParam         = "posted_ack"
	disconnectErrCodeParam = "disconnect_err_code"
	clientPingTimeoutErrCode      = 4000
	clientSequenceMismatchErrCode = 4001
)
func validateDisconnectErrCode(errCode string) bool {
	if errCode == "" {
		return false
	}
	code, err := strconv.Atoi(errCode)
	if err != nil {
		return false
	}
	if (code < 1000 || code > 1016) &&
		code != clientPingTimeoutErrCode &&
		code != clientSequenceMismatchErrCode {
		return false
	}
	return true
}
func (api *API) InitWebSocket() {
	api.BaseRoutes.APIRoot.Handle("/{websocket:websocket(?:\\/)?}", api.APIHandlerTrustRequester(connectWebSocket)).Methods(http.MethodGet)
}
func connectWebSocket(c *Context, w http.ResponseWriter, r *http.Request) {
	upgrader := websocket.Upgrader{
		ReadBufferSize:  model.SocketMaxMessageSizeKb,
		WriteBufferSize: model.SocketMaxMessageSizeKb,
		CheckOrigin:     c.App.OriginChecker(),
	}
	ws, err := upgrader.Upgrade(w, r, nil)
	if err != nil {
		params := map[string]any{
			"BlockedOrigin": r.Header.Get("Origin"),
		}
		c.Err = model.NewAppError("connect", "api.web_socket.connect.upgrade.app_error", params, "", http.StatusBadRequest).Wrap(err)
		return
	}
	cfg := &platform.WebConnConfig{
		WebSocket:     ws,
		Session:       *c.AppContext.Session(),
		TFunc:         c.AppContext.T,
		Locale:        "",
		Active:        true,
		PostedAck:     r.URL.Query().Get(postedAckParam) == "true",
		RemoteAddress: c.AppContext.IPAddress(),
		XForwardedFor: c.AppContext.XForwardedFor(),
	}
	disconnectErrCode := r.URL.Query().Get(disconnectErrCodeParam)
	if codeValid := validateDisconnectErrCode(disconnectErrCode); codeValid {
		cfg.DisconnectErrCode = disconnectErrCode
	}
	if c.AppContext.Session().IsMobileApp() {
		cfg.OriginClient = "mobile"
	} else {
		cfg.OriginClient = string(web.GetOriginClient(r))
	}
	cfg.ConnectionID = r.URL.Query().Get(connectionIDParam)
	if cfg.ConnectionID == "" || c.AppContext.Session().UserId == "" {
		cfg.ConnectionID = model.NewId()
	} else {
		cfg, err = c.App.Srv().Platform().PopulateWebConnConfig(c.AppContext.Session(), cfg, r.URL.Query().Get(sequenceNumberParam))
		if err != nil {
			c.Logger.Error("Error while populating webconn config", mlog.String("id", r.URL.Query().Get(connectionIDParam)), mlog.Err(err))
			ws.Close()
			return
		}
	}
	wc := c.App.Srv().Platform().NewWebConn(cfg, c.App, c.App.Srv().Channels())
	if c.AppContext.Session().UserId != "" {
		err = c.App.Srv().Platform().HubRegister(wc)
		if err != nil {
			c.Logger.Error("Error while registering to hub", mlog.String("id", r.URL.Query().Get(connectionIDParam)), mlog.Err(err))
			ws.Close()
			return
		}
	}
	wc.Pump()
}