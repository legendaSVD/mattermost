package model
import (
	"github.com/mattermost/mattermost/server/public/shared/i18n"
	"github.com/vmihailenco/msgpack/v5"
)
const (
	WebSocketRemoteAddr    = "remote_addr"
	WebSocketXForwardedFor = "x_forwarded_for"
)
type WebSocketRequest struct {
	Seq    int64          `json:"seq" msgpack:"seq"`
	Action string         `json:"action" msgpack:"action"`
	Data   map[string]any `json:"data" msgpack:"data"`
	Session Session            `json:"-" msgpack:"-"`
	T       i18n.TranslateFunc `json:"-" msgpack:"-"`
	Locale  string             `json:"-" msgpack:"-"`
}
func (o *WebSocketRequest) Clone() (*WebSocketRequest, error) {
	buf, err := msgpack.Marshal(o)
	if err != nil {
		return nil, err
	}
	var ret WebSocketRequest
	err = msgpack.Unmarshal(buf, &ret)
	if err != nil {
		return nil, err
	}
	return &ret, nil
}