package platform
import (
	"bytes"
	"crypto/tls"
	"encoding/json"
	"errors"
	"fmt"
	"net"
	"net/http"
	"os"
	"slices"
	"strconv"
	"strings"
	"sync"
	"sync/atomic"
	"time"
	"github.com/gorilla/websocket"
	"github.com/vmihailenco/msgpack/v5"
	"github.com/mattermost/mattermost/server/public/model"
	"github.com/mattermost/mattermost/server/public/plugin"
	"github.com/mattermost/mattermost/server/public/shared/i18n"
	"github.com/mattermost/mattermost/server/public/shared/mlog"
	"github.com/mattermost/mattermost/server/public/shared/request"
	"github.com/mattermost/mattermost/server/v8/channels/store/sqlstore"
)
const (
	sendQueueSize                  = 256
	sendSlowWarn                   = (sendQueueSize * 50) / 100
	sendFullWarn                   = (sendQueueSize * 95) / 100
	writeWaitTime                  = 30 * time.Second
	pongWaitTime                   = 100 * time.Second
	pingInterval                   = (pongWaitTime * 6) / 10
	authCheckInterval              = 5 * time.Second
	webConnMemberCacheTime         = 1000 * 60 * 30
	deadQueueSize                  = 128
	websocketSuppressWarnThreshold = time.Minute
)
const (
	reconnectFound    = "success"
	reconnectNotFound = "failure"
	reconnectLossless = "lossless"
)
const websocketMessagePluginPrefix = "custom_"
const UnsetPresenceIndicator = "<>"
type pluginWSPostedHook struct {
	connectionID string
	userID       string
	req          *model.WebSocketRequest
}
type WebConnConfig struct {
	WebSocket         *websocket.Conn
	Session           model.Session
	TFunc             i18n.TranslateFunc
	Locale            string
	ConnectionID      string
	Active            bool
	ReuseCount        int
	OriginClient      string
	PostedAck         bool
	RemoteAddress     string
	XForwardedFor     string
	DisconnectErrCode string
	sequence         int64
	activeQueue      chan model.WebSocketMessage
	deadQueue        []*model.WebSocketEvent
	deadQueuePointer int
}
type WebConn struct {
	sessionExpiresAt  int64
	Platform          *PlatformService
	Suite             SuiteIFace
	HookRunner        HookRunner
	WebSocket         *websocket.Conn
	T                 i18n.TranslateFunc
	Locale            string
	Sequence          int64
	UserId            string
	PostedAck         bool
	DisconnectErrCode string
	allChannelMembers         map[string]string
	lastAllChannelMembersTime int64
	lastUserActivityAt        int64
	send                      chan model.WebSocketMessage
	deadQueue []*model.WebSocketEvent
	deadQueuePointer int
	Active atomic.Bool
	reuseCount   int
	sessionToken atomic.Value
	session      atomic.Pointer[model.Session]
	connectionID atomic.Value
	originClient string
	remoteAddress string
	xForwardedFor string
	activeChannelID                 atomic.Value
	activeTeamID                    atomic.Value
	activeRHSThreadChannelID        atomic.Value
	activeThreadViewThreadChannelID atomic.Value
	endWritePump chan struct{}
	pumpFinished chan struct{}
	pluginPosted chan pluginWSPostedHook
	lastLogTimeSlow time.Time
	lastLogTimeFull time.Time
}
type CheckConnResult struct {
	ConnectionID     string
	UserID           string
	ActiveQueue      chan model.WebSocketMessage
	DeadQueue        []*model.WebSocketEvent
	DeadQueuePointer int
	ReuseCount       int
}
func (ps *PlatformService) PopulateWebConnConfig(s *model.Session, cfg *WebConnConfig, seqVal string) (*WebConnConfig, error) {
	if !model.IsValidId(cfg.ConnectionID) {
		return nil, fmt.Errorf("invalid connection id: %s", cfg.ConnectionID)
	}
	if seqVal == "" {
		return nil, errors.New("sequence number not present in websocket request")
	}
	seqNum, err := strconv.ParseInt(seqVal, 10, 0)
	if err != nil {
		return nil, fmt.Errorf("invalid sequence number %s in query param: %w", seqVal, err)
	}
	res := ps.CheckWebConn(s.UserId, cfg.ConnectionID, seqNum)
	if res == nil {
		cfg.ConnectionID = model.NewId()
	} else {
		cfg.activeQueue = res.ActiveQueue
		cfg.deadQueue = res.DeadQueue
		cfg.deadQueuePointer = res.DeadQueuePointer
		cfg.Active = false
		cfg.ReuseCount = res.ReuseCount
		cfg.sequence = seqNum
	}
	return cfg, nil
}
func (ps *PlatformService) NewWebConn(cfg *WebConnConfig, suite SuiteIFace, runner HookRunner) *WebConn {
	userID := cfg.Session.UserId
	session := cfg.Session
	if cfg.Session.UserId != "" {
		ps.Go(func() {
			ps.SetStatusOnline(userID, false)
			ps.UpdateLastActivityAtIfNeeded(session)
		})
	}
	var tcpConn *net.TCPConn
	switch conn := cfg.WebSocket.UnderlyingConn().(type) {
	case *net.TCPConn:
		tcpConn = conn
	case *tls.Conn:
		newConn, ok := conn.NetConn().(*net.TCPConn)
		if ok {
			tcpConn = newConn
		}
	}
	if tcpConn != nil {
		err := tcpConn.SetNoDelay(false)
		if err != nil {
			ps.logger.Warn("Error in setting NoDelay socket opts", mlog.Err(err))
		}
	}
	if cfg.activeQueue == nil {
		cfg.activeQueue = make(chan model.WebSocketMessage, sendQueueSize)
	}
	if cfg.deadQueue == nil {
		cfg.deadQueue = make([]*model.WebSocketEvent, deadQueueSize)
	}
	wc := &WebConn{
		Platform:           ps,
		Suite:              suite,
		HookRunner:         runner,
		send:               cfg.activeQueue,
		deadQueue:          cfg.deadQueue,
		deadQueuePointer:   cfg.deadQueuePointer,
		Sequence:           cfg.sequence,
		WebSocket:          cfg.WebSocket,
		lastUserActivityAt: model.GetMillis(),
		UserId:             cfg.Session.UserId,
		T:                  cfg.TFunc,
		Locale:             cfg.Locale,
		PostedAck:          cfg.PostedAck,
		DisconnectErrCode:  cfg.DisconnectErrCode,
		reuseCount:         cfg.ReuseCount,
		endWritePump:       make(chan struct{}),
		pumpFinished:       make(chan struct{}),
		pluginPosted:       make(chan pluginWSPostedHook, 10),
		lastLogTimeSlow:    time.Now(),
		lastLogTimeFull:    time.Now(),
		originClient:       cfg.OriginClient,
		remoteAddress:      cfg.RemoteAddress,
		xForwardedFor:      cfg.XForwardedFor,
	}
	wc.Active.Store(cfg.Active)
	wc.SetSession(&cfg.Session)
	wc.SetSessionToken(cfg.Session.Token)
	wc.SetSessionExpiresAt(cfg.Session.ExpiresAt)
	wc.SetConnectionID(cfg.ConnectionID)
	wc.SetActiveChannelID(UnsetPresenceIndicator)
	wc.SetActiveTeamID(UnsetPresenceIndicator)
	wc.SetActiveRHSThreadChannelID(UnsetPresenceIndicator)
	wc.SetActiveThreadViewThreadChannelID(UnsetPresenceIndicator)
	ps.Go(func() {
		runner.RunMultiHook(func(hooks plugin.Hooks, _ *model.Manifest) bool {
			hooks.OnWebSocketConnect(wc.GetConnectionID(), userID)
			return true
		}, plugin.OnWebSocketConnectID)
	})
	return wc
}
func (wc *WebConn) pluginPostedConsumer(wg *sync.WaitGroup) {
	defer wg.Done()
	for msg := range wc.pluginPosted {
		wc.HookRunner.RunMultiHook(func(hooks plugin.Hooks, _ *model.Manifest) bool {
			hooks.WebSocketMessageHasBeenPosted(msg.connectionID, msg.userID, msg.req)
			return true
		}, plugin.WebSocketMessageHasBeenPostedID)
	}
}
func (wc *WebConn) Close() {
	wc.WebSocket.Close()
	<-wc.pumpFinished
}
func (wc *WebConn) GetSessionExpiresAt() int64 {
	return atomic.LoadInt64(&wc.sessionExpiresAt)
}
func (wc *WebConn) SetSessionExpiresAt(v int64) {
	atomic.StoreInt64(&wc.sessionExpiresAt, v)
}
func (wc *WebConn) GetSessionToken() string {
	return wc.sessionToken.Load().(string)
}
func (wc *WebConn) SetSessionToken(v string) {
	wc.sessionToken.Store(v)
}
func (wc *WebConn) SetConnectionID(id string) {
	wc.connectionID.Store(id)
}
func (wc *WebConn) GetConnectionID() string {
	if wc.connectionID.Load() == nil {
		return ""
	}
	return wc.connectionID.Load().(string)
}
func (wc *WebConn) SetActiveChannelID(id string) {
	wc.activeChannelID.Store(id)
}
func (wc *WebConn) GetActiveChannelID() string {
	if wc.activeChannelID.Load() == nil {
		return UnsetPresenceIndicator
	}
	return wc.activeChannelID.Load().(string)
}
func (wc *WebConn) SetActiveTeamID(id string) {
	wc.activeTeamID.Store(id)
}
func (wc *WebConn) GetActiveTeamID() string {
	if wc.activeTeamID.Load() == nil {
		return UnsetPresenceIndicator
	}
	return wc.activeTeamID.Load().(string)
}
func (wc *WebConn) GetActiveRHSThreadChannelID() string {
	if wc.activeRHSThreadChannelID.Load() == nil {
		return UnsetPresenceIndicator
	}
	return wc.activeRHSThreadChannelID.Load().(string)
}
func (wc *WebConn) SetActiveRHSThreadChannelID(id string) {
	wc.activeRHSThreadChannelID.Store(id)
}
func (wc *WebConn) GetActiveThreadViewThreadChannelID() string {
	if wc.activeThreadViewThreadChannelID.Load() == nil {
		return UnsetPresenceIndicator
	}
	return wc.activeThreadViewThreadChannelID.Load().(string)
}
func (wc *WebConn) SetActiveThreadViewThreadChannelID(id string) {
	wc.activeThreadViewThreadChannelID.Store(id)
}
func (wc *WebConn) isSet(val string) bool {
	return val != UnsetPresenceIndicator
}
func (wc *WebConn) GetSession() *model.Session {
	return wc.session.Load()
}
func (wc *WebConn) SetSession(v *model.Session) {
	if v != nil {
		v = v.DeepCopy()
	}
	wc.session.Store(v)
}
func (wc *WebConn) Pump() {
	var wg sync.WaitGroup
	wg.Add(1)
	go func() {
		defer wg.Done()
		wc.writePump()
	}()
	wg.Add(1)
	go wc.pluginPostedConsumer(&wg)
	wc.readPump()
	close(wc.endWritePump)
	close(wc.pluginPosted)
	wg.Wait()
	wc.Platform.HubUnregister(wc)
	close(wc.pumpFinished)
	userID := wc.UserId
	wc.Platform.Go(func() {
		wc.HookRunner.RunMultiHook(func(hooks plugin.Hooks, _ *model.Manifest) bool {
			hooks.OnWebSocketDisconnect(wc.GetConnectionID(), userID)
			return true
		}, plugin.OnWebSocketDisconnectID)
	})
}
func (wc *WebConn) readPump() {
	defer func() {
		if metrics := wc.Platform.metricsIFace; metrics != nil {
			metrics.DecrementHTTPWebSockets(wc.originClient)
		}
		wc.WebSocket.Close()
	}()
	if metrics := wc.Platform.metricsIFace; metrics != nil {
		metrics.IncrementHTTPWebSockets(wc.originClient)
	}
	wc.WebSocket.SetReadLimit(model.SocketMaxMessageSizeKb)
	err := wc.WebSocket.SetReadDeadline(time.Now().Add(pongWaitTime))
	if err != nil {
		wc.logSocketErr("websocket.SetReadDeadline", err)
		return
	}
	wc.WebSocket.SetPongHandler(func(string) error {
		if err := wc.WebSocket.SetReadDeadline(time.Now().Add(pongWaitTime)); err != nil {
			return err
		}
		if wc.IsBasicAuthenticated() {
			userID := wc.UserId
			wc.Platform.Go(func() {
				wc.Platform.SetStatusAwayIfNeeded(userID, false)
			})
		}
		return nil
	})
	for {
		msgType, rd, err := wc.WebSocket.NextReader()
		if err != nil {
			wc.logSocketErr("websocket.NextReader", err)
			return
		}
		var decoder interface {
			Decode(v any) error
		}
		if msgType == websocket.TextMessage {
			decoder = json.NewDecoder(rd)
		} else {
			decoder = msgpack.NewDecoder(rd)
		}
		var req model.WebSocketRequest
		if err = decoder.Decode(&req); err != nil {
			wc.logSocketErr("websocket.Decode", err)
			return
		}
		if !strings.HasPrefix(req.Action, websocketMessagePluginPrefix) {
			wc.Platform.WebSocketRouter.ServeWebSocket(wc, &req)
		}
		clonedReq, err := req.Clone()
		if err != nil {
			wc.logSocketErr("websocket.cloneRequest", err)
			continue
		}
		if session := wc.GetSession(); session != nil {
			clonedReq.Session.Id = session.Id
		}
		if clonedReq.Data == nil {
			clonedReq.Data = map[string]any{}
		}
		clonedReq.Data[model.WebSocketRemoteAddr] = wc.remoteAddress
		clonedReq.Data[model.WebSocketXForwardedFor] = wc.xForwardedFor
		wc.pluginPosted <- pluginWSPostedHook{wc.GetConnectionID(), wc.UserId, clonedReq}
	}
}
func (wc *WebConn) writePump() {
	ticker := time.NewTicker(pingInterval)
	authTicker := time.NewTicker(authCheckInterval)
	defer func() {
		ticker.Stop()
		authTicker.Stop()
		wc.WebSocket.Close()
	}()
	if wc.Sequence != 0 {
		if ok, index := wc.isInDeadQueue(wc.Sequence); ok {
			if err := wc.drainDeadQueue(index); err != nil {
				wc.logSocketErr("websocket.drainDeadQueue", err)
				return
			}
			if m := wc.Platform.metricsIFace; m != nil {
				m.IncrementWebsocketReconnectEventWithDisconnectErrCode(reconnectFound, wc.DisconnectErrCode)
			}
		} else if wc.hasMsgLoss() {
			wc.clearDeadQueue()
			wc.SetConnectionID(model.NewId())
			wc.Sequence = 0
			msg := wc.createHelloMessage()
			wc.addToDeadQueue(msg)
			if err := wc.writeMessage(msg); err != nil {
				wc.logSocketErr("websocket.sendHello", err)
				return
			}
			if m := wc.Platform.metricsIFace; m != nil {
				m.IncrementWebsocketReconnectEventWithDisconnectErrCode(reconnectNotFound, wc.DisconnectErrCode)
			}
		} else {
			if m := wc.Platform.metricsIFace; m != nil {
				m.IncrementWebsocketReconnectEventWithDisconnectErrCode(reconnectLossless, wc.DisconnectErrCode)
			}
		}
	}
	var buf bytes.Buffer
	buf.Grow(1024 * 2)
	enc := json.NewEncoder(&buf)
	for {
		select {
		case msg, ok := <-wc.send:
			if !ok {
				if err := wc.writeMessageBuf(websocket.CloseMessage, []byte{}); err != nil {
					wc.logSocketErr("websocket.send", err)
				}
				return
			}
			evt, evtOk := msg.(*model.WebSocketEvent)
			if evtOk && evt.IsRejected() {
				continue
			}
			buf.Reset()
			var err error
			if evtOk {
				evt = evt.SetSequence(wc.Sequence)
				err = evt.Encode(enc, &buf)
				wc.Sequence++
			} else {
				err = enc.Encode(msg)
			}
			if err != nil {
				wc.Platform.logger.Warn("Error in encoding websocket message", mlog.Err(err))
				continue
			}
			if wc.Active.Load() && len(wc.send) >= sendFullWarn && time.Since(wc.lastLogTimeFull) > websocketSuppressWarnThreshold {
				logData := []mlog.Field{
					mlog.String("user_id", wc.UserId),
					mlog.String("conn_id", wc.GetConnectionID()),
					mlog.String("type", msg.EventType()),
					mlog.Int("size", buf.Len()),
				}
				if evtOk {
					logData = append(logData, mlog.String("channel_id", evt.GetBroadcast().ChannelId))
				}
				wc.Platform.logger.Warn("websocket.full", logData...)
				wc.lastLogTimeFull = time.Now()
			}
			if evtOk {
				wc.addToDeadQueue(evt)
			}
			if err := wc.writeMessageBuf(websocket.TextMessage, buf.Bytes()); err != nil {
				wc.logSocketErr("websocket.send", err)
				return
			}
			if m := wc.Platform.metricsIFace; m != nil {
				m.IncrementWebSocketBroadcast(msg.EventType())
			}
		case <-ticker.C:
			if err := wc.writeMessageBuf(websocket.PingMessage, []byte{}); err != nil {
				wc.logSocketErr("websocket.ticker", err)
				return
			}
		case <-wc.endWritePump:
			return
		case <-authTicker.C:
			if wc.GetSessionToken() == "" {
				wc.Platform.logger.Debug("websocket.authTicker: did not authenticate", mlog.Stringer("ip_address", wc.WebSocket.RemoteAddr()))
				return
			}
			authTicker.Stop()
		}
	}
}
func (wc *WebConn) writeMessageBuf(msgType int, data []byte) error {
	if err := wc.WebSocket.SetWriteDeadline(time.Now().Add(writeWaitTime)); err != nil {
		return err
	}
	return wc.WebSocket.WriteMessage(msgType, data)
}
func (wc *WebConn) writeMessage(msg *model.WebSocketEvent) error {
	var buf bytes.Buffer
	err := msg.Encode(json.NewEncoder(&buf), &buf)
	if err != nil {
		wc.Platform.logger.Warn("Error in encoding websocket message", mlog.Err(err))
		return nil
	}
	wc.Sequence++
	return wc.writeMessageBuf(websocket.TextMessage, buf.Bytes())
}
func (wc *WebConn) addToDeadQueue(msg *model.WebSocketEvent) {
	wc.deadQueue[wc.deadQueuePointer] = msg
	wc.deadQueuePointer = (wc.deadQueuePointer + 1) % deadQueueSize
}
func (wc *WebConn) hasMsgLoss() bool {
	return _hasMsgLoss(wc.deadQueue, wc.deadQueuePointer, wc.Sequence)
}
func (wc *WebConn) isInDeadQueue(seq int64) (bool, int) {
	return _isInDeadQueue(wc.deadQueue, seq)
}
func _hasMsgLoss(deadQueue []*model.WebSocketEvent, deadQueuePtr int, seq int64) bool {
	var index int
	if deadQueuePtr == 0 {
		if deadQueue[0] == nil {
			return false
		}
		index = deadQueueSize - 1
	} else {
		index = deadQueuePtr - 1
	}
	if deadQueue[index].GetSequence() == seq-1 {
		return false
	}
	return true
}
func _isInDeadQueue(deadQueue []*model.WebSocketEvent, seq int64) (bool, int) {
	for i := range deadQueueSize {
		elem := deadQueue[i]
		if elem == nil {
			return false, 0
		}
		if elem.GetSequence() == seq {
			return true, i
		}
	}
	return false, 0
}
func (wc *WebConn) clearDeadQueue() {
	for i := range deadQueueSize {
		if wc.deadQueue[i] == nil {
			break
		}
		wc.deadQueue[i] = nil
	}
	wc.deadQueuePointer = 0
}
func (wc *WebConn) drainDeadQueue(index int) error {
	if wc.deadQueue[0] == nil {
		return nil
	}
	if wc.deadQueue[wc.deadQueuePointer] == nil {
		for i := index; i < wc.deadQueuePointer; i++ {
			if err := wc.writeMessage(wc.deadQueue[i]); err != nil {
				return err
			}
		}
		return nil
	}
	currPtr := index
	for {
		if err := wc.writeMessage(wc.deadQueue[currPtr]); err != nil {
			return err
		}
		oldSeq := wc.deadQueue[currPtr].GetSequence()
		currPtr = (currPtr + 1) % deadQueueSize
		newSeq := wc.deadQueue[currPtr].GetSequence()
		if oldSeq > newSeq {
			break
		}
	}
	return nil
}
func (wc *WebConn) InvalidateCache() {
	wc.allChannelMembers = nil
	wc.lastAllChannelMembersTime = 0
	wc.SetSession(nil)
	wc.SetSessionExpiresAt(0)
}
func (wc *WebConn) IsBasicAuthenticated() bool {
	if wc.GetSessionExpiresAt() < model.GetMillis() {
		if wc.GetSessionToken() == "" {
			return false
		}
		session, err := wc.Suite.GetSession(wc.GetSessionToken())
		if err != nil {
			if err.StatusCode >= http.StatusBadRequest && err.StatusCode < http.StatusInternalServerError {
				wc.Platform.logger.Debug("Invalid session.", mlog.Err(err))
			} else {
				wc.Platform.logger.Error("Could not get session", mlog.String("session_token", wc.GetSessionToken()), mlog.Err(err))
			}
			wc.SetSessionToken("")
			wc.SetSession(nil)
			wc.SetSessionExpiresAt(0)
			return false
		}
		wc.SetSession(session)
		wc.SetSessionExpiresAt(session.ExpiresAt)
	}
	return true
}
func (wc *WebConn) IsMFAAuthenticated() bool {
	session := wc.GetSession()
	c := request.EmptyContext(wc.Platform.logger).WithSession(session)
	if appErr := wc.Suite.MFARequired(c); appErr != nil {
		return false
	}
	return true
}
func (wc *WebConn) IsAuthenticated() bool {
	return wc.IsBasicAuthenticated() && wc.IsMFAAuthenticated()
}
func (wc *WebConn) createHelloMessage() *model.WebSocketEvent {
	ee := wc.Platform.LicenseManager() != nil
	msg := model.NewWebSocketEvent(model.WebsocketEventHello, "", "", wc.UserId, nil, "")
	msg.Add("server_version", fmt.Sprintf("%v.%v.%v.%v", model.CurrentVersion,
		model.BuildNumber,
		wc.Platform.ClientConfigHash(),
		ee))
	msg.Add("connection_id", wc.connectionID.Load())
	hostname, err := os.Hostname()
	if err != nil {
		wc.Platform.logger.Warn("Could not get hostname",
			mlog.String("user_id", wc.UserId),
			mlog.String("conn_id", wc.GetConnectionID()),
			mlog.Err(err))
		return msg
	}
	msg.Add("server_hostname", hostname)
	return msg
}
func (wc *WebConn) ShouldSendEventToGuest(msg *model.WebSocketEvent) bool {
	var userID string
	var canSee bool
	switch msg.EventType() {
	case model.WebsocketEventUserUpdated:
		user, ok := msg.GetData()["user"].(*model.User)
		if !ok {
			wc.Platform.logger.Debug("webhub.shouldSendEvent: user not found in message", mlog.Any("user", msg.GetData()["user"]))
			return false
		}
		userID = user.Id
	case model.WebsocketEventNewUser:
		userID = msg.GetData()["user_id"].(string)
	default:
		return true
	}
	c := request.EmptyContext(wc.Platform.logger)
	canSee, err := wc.Suite.UserCanSeeOtherUser(c, wc.UserId, userID)
	if err != nil {
		mlog.Error("webhub.shouldSendEvent.", mlog.Err(err))
		return false
	}
	return canSee
}
func (wc *WebConn) ShouldSendEvent(msg *model.WebSocketEvent) bool {
	if !wc.IsAuthenticated() {
		return false
	}
	if len(wc.send) >= sendSlowWarn {
		switch msg.EventType() {
		case model.WebsocketEventTyping,
			model.WebsocketEventStatusChange,
			model.WebsocketEventMultipleChannelsViewed:
			if wc.Active.Load() && time.Since(wc.lastLogTimeSlow) > websocketSuppressWarnThreshold {
				wc.Platform.logger.Warn(
					"websocket.slow: dropping message",
					mlog.String("user_id", wc.UserId),
					mlog.String("conn_id", wc.GetConnectionID()),
					mlog.String("type", msg.EventType()),
				)
				wc.lastLogTimeSlow = time.Now()
			}
			return false
		}
	}
	var hasReadPrivateDataPermission *bool
	if msg.GetBroadcast().ContainsSanitizedData {
		hasReadPrivateDataPermission = model.NewPointer(wc.Suite.RolesGrantPermission(wc.GetSession().GetUserRoles(), model.PermissionManageSystem.Id))
		if *hasReadPrivateDataPermission {
			return false
		}
	}
	if msg.GetBroadcast().ContainsSensitiveData {
		if hasReadPrivateDataPermission == nil {
			hasReadPrivateDataPermission = model.NewPointer(wc.Suite.RolesGrantPermission(wc.GetSession().GetUserRoles(), model.PermissionManageSystem.Id))
		}
		if !*hasReadPrivateDataPermission {
			return false
		}
	}
	if msg.GetBroadcast().ConnectionId != "" {
		return wc.GetConnectionID() == msg.GetBroadcast().ConnectionId
	}
	if wc.GetConnectionID() == msg.GetBroadcast().OmitConnectionId {
		return false
	}
	if msg.GetBroadcast().UserId != "" {
		return wc.UserId == msg.GetBroadcast().UserId
	}
	if len(msg.GetBroadcast().OmitUsers) > 0 {
		if _, ok := msg.GetBroadcast().OmitUsers[wc.UserId]; ok {
			return false
		}
	}
	if chID := msg.GetBroadcast().ChannelId; chID != "" {
		if wc.Platform.Config().FeatureFlags.WebSocketEventScope &&
			slices.Contains([]model.WebsocketEventType{
				model.WebsocketEventTyping,
				model.WebsocketEventReactionAdded,
				model.WebsocketEventReactionRemoved,
			}, msg.EventType()) && wc.notInChannel(chID) && wc.notInThread(chID) {
			return false
		}
		if *wc.Platform.Config().ServiceSettings.EnableWebHubChannelIteration {
			return true
		}
		if model.GetMillis()-wc.lastAllChannelMembersTime > webConnMemberCacheTime {
			wc.allChannelMembers = nil
			wc.lastAllChannelMembersTime = 0
		}
		if wc.allChannelMembers == nil {
			result, err := wc.Platform.Store.Channel().GetAllChannelMembersForUser(
				sqlstore.RequestContextWithMaster(request.EmptyContext(wc.Platform.logger)),
				wc.UserId,
				false,
				false,
			)
			if err != nil {
				mlog.Error("webhub.shouldSendEvent.", mlog.Err(err))
				return false
			}
			wc.allChannelMembers = result
			wc.lastAllChannelMembersTime = model.GetMillis()
		}
		if _, ok := wc.allChannelMembers[chID]; ok {
			return true
		}
		return false
	}
	if msg.GetBroadcast().TeamId != "" {
		return wc.isMemberOfTeam(msg.GetBroadcast().TeamId)
	}
	if wc.GetSession().Props[model.SessionPropIsGuest] == "true" {
		return wc.ShouldSendEventToGuest(msg)
	}
	return true
}
func (wc *WebConn) notInChannel(val string) bool {
	return (wc.isSet(wc.GetActiveChannelID()) && val != wc.GetActiveChannelID())
}
func (wc *WebConn) notInThread(val string) bool {
	return (wc.isSet(wc.GetActiveRHSThreadChannelID()) && val != wc.GetActiveRHSThreadChannelID()) &&
		(wc.isSet(wc.GetActiveThreadViewThreadChannelID()) && val != wc.GetActiveThreadViewThreadChannelID())
}
func (wc *WebConn) isMemberOfTeam(teamID string) bool {
	currentSession := wc.GetSession()
	if currentSession == nil || currentSession.Token == "" {
		session, err := wc.Suite.GetSession(wc.GetSessionToken())
		if err != nil {
			if err.StatusCode >= http.StatusBadRequest && err.StatusCode < http.StatusInternalServerError {
				wc.Platform.logger.Debug("Invalid session.", mlog.Err(err))
			} else {
				wc.Platform.logger.Error("Could not get session", mlog.String("session_token", wc.GetSessionToken()), mlog.Err(err))
			}
			return false
		}
		wc.SetSession(session)
		currentSession = session
	}
	return currentSession.GetTeamByTeamId(teamID) != nil
}
func (wc *WebConn) logSocketErr(source string, err error) {
	if websocket.IsCloseError(err, websocket.CloseNormalClosure, websocket.CloseNoStatusReceived) {
		wc.Platform.logger.Debug(source+": client side closed socket",
			mlog.String("user_id", wc.UserId),
			mlog.String("conn_id", wc.GetConnectionID()),
			mlog.String("origin_client", wc.originClient))
	} else {
		wc.Platform.logger.Debug(source+": closing websocket",
			mlog.String("user_id", wc.UserId),
			mlog.String("conn_id", wc.GetConnectionID()),
			mlog.String("origin_client", wc.originClient),
			mlog.Err(err))
	}
}