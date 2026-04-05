package config
import (
	"sync"
	"github.com/mattermost/mattermost/server/public/model"
	"github.com/mattermost/mattermost/server/public/shared/mlog"
)
type Listener func(oldCfg, newCfg *model.Config)
type emitter struct {
	listeners sync.Map
}
func (e *emitter) AddListener(listener Listener) string {
	id := model.NewId()
	e.listeners.Store(id, listener)
	return id
}
func (e *emitter) RemoveListener(id string) {
	e.listeners.Delete(id)
}
func (e *emitter) invokeConfigListeners(oldCfg, newCfg *model.Config) {
	e.listeners.Range(func(key, value any) bool {
		listener := value.(Listener)
		listener(oldCfg, newCfg)
		return true
	})
}
type logSrcEmitter struct {
	listeners sync.Map
}
func (e *logSrcEmitter) AddListener(listener LogSrcListener) string {
	id := model.NewId()
	e.listeners.Store(id, listener)
	return id
}
func (e *logSrcEmitter) RemoveListener(id string) {
	e.listeners.Delete(id)
}
func (e *logSrcEmitter) invokeConfigListeners(oldCfg, newCfg mlog.LoggerConfiguration) {
	e.listeners.Range(func(key, value any) bool {
		listener := value.(LogSrcListener)
		listener(oldCfg, newCfg)
		return true
	})
}