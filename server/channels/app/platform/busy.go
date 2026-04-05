package platform
import (
	"encoding/json"
	"fmt"
	"sync"
	"sync/atomic"
	"time"
	"github.com/mattermost/mattermost/server/public/model"
	"github.com/mattermost/mattermost/server/v8/einterfaces"
)
const (
	TimestampFormat = "Mon Jan 2 15:04:05 -0700 MST 2006"
)
type Busy struct {
	busy    int32
	mux     sync.RWMutex
	timer   *time.Timer
	expires time.Time
	cluster einterfaces.ClusterInterface
}
func NewBusy(cluster einterfaces.ClusterInterface) *Busy {
	return &Busy{cluster: cluster}
}
func (b *Busy) IsBusy() bool {
	if b == nil {
		return false
	}
	return atomic.LoadInt32(&b.busy) != 0
}
func (b *Busy) Set(dur time.Duration) {
	b.mux.Lock()
	defer b.mux.Unlock()
	if dur < (time.Second * 1) {
		dur = time.Second * 1
	}
	b.setWithoutNotify(dur)
	if b.cluster != nil {
		sbs := &model.ServerBusyState{Busy: true, Expires: b.expires.Unix(), ExpiresTS: b.expires.UTC().Format(TimestampFormat)}
		b.notifyServerBusyChange(sbs)
	}
}
func (b *Busy) setWithoutNotify(dur time.Duration) {
	b.clearWithoutNotify()
	atomic.StoreInt32(&b.busy, 1)
	b.expires = time.Now().Add(dur)
	b.timer = time.AfterFunc(dur, func() {
		b.mux.Lock()
		b.clearWithoutNotify()
		b.mux.Unlock()
	})
}
func (b *Busy) Clear() {
	b.mux.Lock()
	defer b.mux.Unlock()
	b.clearWithoutNotify()
	if b.cluster != nil {
		sbs := &model.ServerBusyState{Busy: false, Expires: time.Time{}.Unix(), ExpiresTS: ""}
		b.notifyServerBusyChange(sbs)
	}
}
func (b *Busy) clearWithoutNotify() {
	if b.timer != nil {
		b.timer.Stop()
	}
	b.timer = nil
	b.expires = time.Time{}
	atomic.StoreInt32(&b.busy, 0)
}
func (b *Busy) Expires() time.Time {
	b.mux.RLock()
	defer b.mux.RUnlock()
	return b.expires
}
func (b *Busy) notifyServerBusyChange(sbs *model.ServerBusyState) {
	if b.cluster == nil {
		return
	}
	buf, _ := json.Marshal(sbs)
	msg := &model.ClusterMessage{
		Event:            model.ClusterEventBusyStateChanged,
		SendType:         model.ClusterSendReliable,
		WaitForAllToSend: true,
		Data:             buf,
	}
	b.cluster.SendClusterMessage(msg)
}
func (b *Busy) ClusterEventChanged(sbs *model.ServerBusyState) {
	b.mux.Lock()
	defer b.mux.Unlock()
	if sbs.Busy {
		expires := time.Unix(sbs.Expires, 0)
		dur := time.Until(expires)
		if dur > 0 {
			b.setWithoutNotify(dur)
		}
	} else {
		b.clearWithoutNotify()
	}
}
func (b *Busy) ToJSON() ([]byte, error) {
	b.mux.RLock()
	defer b.mux.RUnlock()
	sbs := &model.ServerBusyState{
		Busy:      atomic.LoadInt32(&b.busy) != 0,
		Expires:   b.expires.Unix(),
		ExpiresTS: b.expires.UTC().Format(TimestampFormat),
	}
	sbsJSON, jsonErr := json.Marshal(sbs)
	if jsonErr != nil {
		return []byte{}, fmt.Errorf("failed to encode server busy state to JSON: %w", jsonErr)
	}
	return sbsJSON, nil
}