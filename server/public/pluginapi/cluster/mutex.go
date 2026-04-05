package cluster
import (
	"context"
	"sync"
	"time"
	"github.com/mattermost/mattermost/server/public/model"
	"github.com/pkg/errors"
)
const (
	mutexPrefix = "mutex_"
)
const (
	ttl = time.Second * 15
	refreshInterval = ttl / 2
)
type MutexPluginAPI interface {
	KVSetWithOptions(key string, value []byte, options model.PluginKVSetOptions) (bool, *model.AppError)
	LogError(msg string, keyValuePairs ...any)
}
type Mutex struct {
	pluginAPI MutexPluginAPI
	key       string
	lock        sync.Mutex
	stopRefresh chan bool
	refreshDone chan bool
}
func NewMutex(pluginAPI MutexPluginAPI, key string) (*Mutex, error) {
	key, err := makeLockKey(key)
	if err != nil {
		return nil, err
	}
	return &Mutex{
		pluginAPI: pluginAPI,
		key:       key,
	}, nil
}
func makeLockKey(key string) (string, error) {
	if key == "" {
		return "", errors.New("must specify valid mutex key")
	}
	return mutexPrefix + key, nil
}
func (m *Mutex) tryLock() (bool, error) {
	ok, err := m.pluginAPI.KVSetWithOptions(m.key, []byte{1}, model.PluginKVSetOptions{
		Atomic:          true,
		OldValue:        nil,
		ExpireInSeconds: int64(ttl / time.Second),
	})
	if err != nil {
		return false, errors.Wrap(err, "failed to set mutex kv")
	}
	return ok, nil
}
func (m *Mutex) refreshLock() error {
	ok, err := m.pluginAPI.KVSetWithOptions(m.key, []byte{1}, model.PluginKVSetOptions{
		Atomic:          true,
		OldValue:        []byte{1},
		ExpireInSeconds: int64(ttl / time.Second),
	})
	if err != nil {
		return errors.Wrap(err, "failed to refresh mutex kv")
	} else if !ok {
		return errors.New("unexpectedly failed to refresh mutex kv")
	}
	return nil
}
func (m *Mutex) Lock() {
	_ = m.LockWithContext(context.Background())
}
func (m *Mutex) LockWithContext(ctx context.Context) error {
	var waitInterval time.Duration
	for {
		select {
		case <-ctx.Done():
			return ctx.Err()
		case <-time.After(waitInterval):
		}
		locked, err := m.tryLock()
		if err != nil {
			m.pluginAPI.LogError("failed to lock mutex", "err", err, "lock_key", m.key)
			waitInterval = nextWaitInterval(waitInterval, err)
			continue
		} else if !locked {
			waitInterval = nextWaitInterval(waitInterval, err)
			continue
		}
		stop := make(chan bool)
		done := make(chan bool)
		go func() {
			defer close(done)
			t := time.NewTicker(refreshInterval)
			for {
				select {
				case <-t.C:
					err := m.refreshLock()
					if err != nil {
						m.pluginAPI.LogError("failed to refresh mutex", "err", err, "lock_key", m.key)
						return
					}
				case <-stop:
					return
				}
			}
		}()
		m.lock.Lock()
		m.stopRefresh = stop
		m.refreshDone = done
		m.lock.Unlock()
		return nil
	}
}
func (m *Mutex) Unlock() {
	m.lock.Lock()
	if m.stopRefresh == nil {
		m.lock.Unlock()
		panic("mutex has not been acquired")
	}
	close(m.stopRefresh)
	m.stopRefresh = nil
	<-m.refreshDone
	m.lock.Unlock()
	_, _ = m.pluginAPI.KVSetWithOptions(m.key, nil, model.PluginKVSetOptions{})
}