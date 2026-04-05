package model
import (
	"bytes"
	"encoding/json"
	"fmt"
	"net/http"
	"sync/atomic"
	"time"
	"github.com/mattermost/mattermost/server/public/shared/mlog"
	"github.com/gorilla/websocket"
	"github.com/vmihailenco/msgpack/v5"
)
const (
	SocketMaxMessageSizeKb   = 8 * 1024
	PingTimeoutBufferSeconds = 5
)
type msgType int
const (
	msgTypeJSON msgType = iota + 1
	msgTypePong
	msgTypeBinary
)
type writeMessage struct {
	msgType msgType
	data    any
}
const avgReadMsgSizeBytes = 1024
type WebSocketClient struct {
	URL                string
	APIURL             string
	ConnectURL         string
	Conn               *websocket.Conn
	AuthToken          string
	Sequence           int64
	PingTimeoutChannel chan bool
	EventChannel       chan *WebSocketEvent
	ResponseChannel    chan *WebSocketResponse
	ListenError        *AppError
	writeChan          chan writeMessage
	pingTimeoutTimer *time.Timer
	quitPingWatchdog chan struct{}
	quitWriterChan chan struct{}
	resetTimerChan chan struct{}
	closed         int32
}
func NewWebSocketClient(url, authToken string) (*WebSocketClient, error) {
	return NewWebSocketClientWithDialer(websocket.DefaultDialer, url, authToken)
}
func NewReliableWebSocketClientWithDialer(dialer *websocket.Dialer, url, authToken, connID string, seqNo int, withAuthHeader bool) (*WebSocketClient, error) {
	connectURL := url + APIURLSuffix + "/websocket" + fmt.Sprintf("?connection_id=%s&sequence_number=%d", connID, seqNo)
	var header http.Header
	if withAuthHeader {
		header = http.Header{
			"Authorization": []string{"Bearer " + authToken},
		}
	}
	return makeClient(dialer, url, connectURL, authToken, header)
}
func NewWebSocketClientWithDialer(dialer *websocket.Dialer, url, authToken string) (*WebSocketClient, error) {
	return makeClient(dialer, url, url+APIURLSuffix+"/websocket", authToken, nil)
}
func makeClient(dialer *websocket.Dialer, url, connectURL, authToken string, header http.Header) (*WebSocketClient, error) {
	conn, _, err := dialer.Dial(connectURL, header)
	if err != nil {
		return nil, NewAppError("NewWebSocketClient", "model.websocket_client.connect_fail.app_error", nil, "", http.StatusInternalServerError).Wrap(err)
	}
	client := &WebSocketClient{
		URL:                url,
		APIURL:             url + APIURLSuffix,
		ConnectURL:         connectURL,
		Conn:               conn,
		AuthToken:          authToken,
		Sequence:           1,
		PingTimeoutChannel: make(chan bool, 1),
		EventChannel:       make(chan *WebSocketEvent, 100),
		ResponseChannel:    make(chan *WebSocketResponse, 100),
		writeChan:          make(chan writeMessage),
		quitPingWatchdog:   make(chan struct{}),
		quitWriterChan:     make(chan struct{}),
		resetTimerChan:     make(chan struct{}),
	}
	client.configurePingHandling()
	go client.writer()
	client.SendMessage(string(WebsocketAuthenticationChallenge), map[string]any{"token": authToken})
	return client, nil
}
func NewWebSocketClient4(url, authToken string) (*WebSocketClient, error) {
	return NewWebSocketClient4WithDialer(websocket.DefaultDialer, url, authToken)
}
func NewWebSocketClient4WithDialer(dialer *websocket.Dialer, url, authToken string) (*WebSocketClient, error) {
	return NewWebSocketClientWithDialer(dialer, url, authToken)
}
func (wsc *WebSocketClient) Connect() *AppError {
	return wsc.ConnectWithDialer(websocket.DefaultDialer)
}
func (wsc *WebSocketClient) ConnectWithDialer(dialer *websocket.Dialer) *AppError {
	var err error
	wsc.Conn, _, err = dialer.Dial(wsc.ConnectURL, nil)
	if err != nil {
		return NewAppError("Connect", "model.websocket_client.connect_fail.app_error", nil, "", http.StatusInternalServerError).Wrap(err)
	}
	wsc.configurePingHandling()
	if atomic.CompareAndSwapInt32(&wsc.closed, 1, 0) {
		wsc.writeChan = make(chan writeMessage)
		wsc.quitWriterChan = make(chan struct{})
		go wsc.writer()
		wsc.resetTimerChan = make(chan struct{})
		wsc.quitPingWatchdog = make(chan struct{})
	}
	wsc.EventChannel = make(chan *WebSocketEvent, 100)
	wsc.ResponseChannel = make(chan *WebSocketResponse, 100)
	wsc.SendMessage(string(WebsocketAuthenticationChallenge), map[string]any{"token": wsc.AuthToken})
	return nil
}
func (wsc *WebSocketClient) Close() {
	if !atomic.CompareAndSwapInt32(&wsc.closed, 0, 1) {
		return
	}
	wsc.quitWriterChan <- struct{}{}
	close(wsc.writeChan)
	wsc.Conn.Close()
}
func (wsc *WebSocketClient) writer() {
	for {
		select {
		case msg := <-wsc.writeChan:
			switch msg.msgType {
			case msgTypeJSON:
				wsc.Conn.WriteJSON(msg.data)
			case msgTypeBinary:
				if data, ok := msg.data.([]byte); ok {
					wsc.Conn.WriteMessage(websocket.BinaryMessage, data)
				}
			case msgTypePong:
				wsc.Conn.WriteMessage(websocket.PongMessage, []byte{})
			}
		case <-wsc.quitWriterChan:
			return
		}
	}
}
func (wsc *WebSocketClient) Listen() {
	go func() {
		defer func() {
			close(wsc.EventChannel)
			close(wsc.ResponseChannel)
			close(wsc.quitPingWatchdog)
			close(wsc.resetTimerChan)
			if !atomic.CompareAndSwapInt32(&wsc.closed, 0, 1) {
				return
			}
			wsc.quitWriterChan <- struct{}{}
			close(wsc.writeChan)
			wsc.Conn.Close()
		}()
		var buf bytes.Buffer
		buf.Grow(avgReadMsgSizeBytes)
		for {
			buf.Reset()
			_, r, err := wsc.Conn.NextReader()
			if err != nil {
				if !websocket.IsCloseError(err, websocket.CloseNormalClosure, websocket.CloseNoStatusReceived) {
					wsc.ListenError = NewAppError("NewWebSocketClient", "model.websocket_client.connect_fail.app_error", nil, "", http.StatusInternalServerError).Wrap(err)
				}
				return
			}
			_, err = buf.ReadFrom(r)
			if err != nil {
				wsc.ListenError = NewAppError("NewWebSocketClient", "model.websocket_client.connect_fail.app_error", nil, "", http.StatusInternalServerError).Wrap(err)
				return
			}
			event, jsonErr := WebSocketEventFromJSON(bytes.NewReader(buf.Bytes()))
			if jsonErr != nil {
				mlog.Warn("Failed to decode from JSON", mlog.Err(jsonErr))
				continue
			}
			if event.IsValid() {
				wsc.EventChannel <- event
				continue
			}
			var response WebSocketResponse
			if err := json.Unmarshal(buf.Bytes(), &response); err == nil && response.IsValid() {
				wsc.ResponseChannel <- &response
				continue
			}
		}
	}()
}
func (wsc *WebSocketClient) SendMessage(action string, data map[string]any) {
	req := &WebSocketRequest{}
	req.Seq = wsc.Sequence
	req.Action = action
	req.Data = data
	wsc.Sequence++
	wsc.writeChan <- writeMessage{
		msgType: msgTypeJSON,
		data:    req,
	}
}
func (wsc *WebSocketClient) SendBinaryMessage(action string, data map[string]any) error {
	req := &WebSocketRequest{}
	req.Seq = wsc.Sequence
	req.Action = action
	req.Data = data
	binaryData, err := msgpack.Marshal(req)
	if err != nil {
		return fmt.Errorf("failed to marshal request to msgpack: %w", err)
	}
	wsc.Sequence++
	wsc.writeChan <- writeMessage{
		msgType: msgTypeBinary,
		data:    binaryData,
	}
	return nil
}
func (wsc *WebSocketClient) UserTyping(channelId, parentId string) {
	data := map[string]any{
		"channel_id": channelId,
		"parent_id":  parentId,
	}
	wsc.SendMessage("user_typing", data)
}
func (wsc *WebSocketClient) GetStatuses() {
	wsc.SendMessage("get_statuses", nil)
}
func (wsc *WebSocketClient) GetStatusesByIds(userIds []string) {
	data := map[string]any{
		"user_ids": userIds,
	}
	wsc.SendMessage("get_statuses_by_ids", data)
}
func (wsc *WebSocketClient) UpdateActiveChannel(channelID string) {
	data := map[string]any{
		"channel_id": channelID,
	}
	wsc.SendMessage(string(WebsocketPresenceIndicator), data)
}
func (wsc *WebSocketClient) UpdateActiveTeam(teamID string) {
	data := map[string]any{
		"team_id": teamID,
	}
	wsc.SendMessage(string(WebsocketPresenceIndicator), data)
}
func (wsc *WebSocketClient) UpdateActiveThread(isThreadView bool, channelID string) {
	data := map[string]any{
		"thread_channel_id": channelID,
		"is_thread_view":    isThreadView,
	}
	wsc.SendMessage(string(WebsocketPresenceIndicator), data)
}
func (wsc *WebSocketClient) configurePingHandling() {
	wsc.Conn.SetPingHandler(wsc.pingHandler)
	wsc.pingTimeoutTimer = time.NewTimer(time.Second * (60 + PingTimeoutBufferSeconds))
	go wsc.pingWatchdog()
}
func (wsc *WebSocketClient) pingHandler(appData string) error {
	if atomic.LoadInt32(&wsc.closed) == 1 {
		return nil
	}
	wsc.resetTimerChan <- struct{}{}
	wsc.writeChan <- writeMessage{
		msgType: msgTypePong,
	}
	return nil
}
func (wsc *WebSocketClient) pingWatchdog() {
	for {
		select {
		case <-wsc.resetTimerChan:
			if !wsc.pingTimeoutTimer.Stop() {
				<-wsc.pingTimeoutTimer.C
			}
			wsc.pingTimeoutTimer.Reset(time.Second * (60 + PingTimeoutBufferSeconds))
		case <-wsc.pingTimeoutTimer.C:
			wsc.PingTimeoutChannel <- true
			wsc.pingTimeoutTimer.Reset(time.Second * (60 + PingTimeoutBufferSeconds))
		case <-wsc.quitPingWatchdog:
			return
		}
	}
}