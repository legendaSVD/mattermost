package cache
import (
	"container/list"
	"sync"
	"time"
	"github.com/tinylib/msgp/msgp"
	"github.com/vmihailenco/msgpack/v5"
	"github.com/mattermost/mattermost/server/public/model"
)
type LRU struct {
	lock                   sync.RWMutex
	size                   int
	len                    int
	currentGeneration      int64
	evictList              *list.List
	items                  map[string]*list.Element
	defaultExpiry          time.Duration
	name                   string
	invalidateClusterEvent model.ClusterEvent
}
type entry struct {
	key        string
	value      []byte
	expires    time.Time
	generation int64
}
func NewLRU(opts *CacheOptions) Cache {
	return &LRU{
		name:                   opts.Name,
		size:                   opts.Size,
		evictList:              list.New(),
		items:                  make(map[string]*list.Element, opts.Size),
		defaultExpiry:          opts.DefaultExpiry,
		invalidateClusterEvent: opts.InvalidateClusterEvent,
	}
}
func (l *LRU) Purge() error {
	l.lock.Lock()
	defer l.lock.Unlock()
	l.len = 0
	l.currentGeneration++
	return nil
}
func (l *LRU) SetWithDefaultExpiry(key string, value any) error {
	return l.SetWithExpiry(key, value, l.defaultExpiry)
}
func (l *LRU) SetWithExpiry(key string, value any, ttl time.Duration) error {
	return l.set(key, value, ttl)
}
func (l *LRU) Get(key string, value any) error {
	return l.get(key, value)
}
func (l *LRU) GetMulti(keys []string, values []any) []error {
	errs := make([]error, 0, len(values))
	for i, key := range keys {
		errs = append(errs, l.get(key, values[i]))
	}
	return errs
}
func (l *LRU) Remove(key string) error {
	l.lock.Lock()
	defer l.lock.Unlock()
	if ent, ok := l.items[key]; ok {
		l.removeElement(ent)
	}
	return nil
}
func (l *LRU) RemoveMulti(keys []string) error {
	l.lock.Lock()
	defer l.lock.Unlock()
	for _, key := range keys {
		if ent, ok := l.items[key]; ok {
			l.removeElement(ent)
		}
	}
	return nil
}
func (l *LRU) Scan(f func([]string) error) error {
	l.lock.RLock()
	keys := make([]string, l.len)
	i := 0
	for ent := l.evictList.Back(); ent != nil; ent = ent.Prev() {
		e := ent.Value.(*entry)
		if e.generation == l.currentGeneration {
			keys[i] = e.key
			i++
		}
	}
	l.lock.RUnlock()
	return f(keys)
}
func (l *LRU) Len() (int, error) {
	l.lock.RLock()
	defer l.lock.RUnlock()
	return l.len, nil
}
func (l *LRU) GetInvalidateClusterEvent() model.ClusterEvent {
	return l.invalidateClusterEvent
}
func (l *LRU) Name() string {
	return l.name
}
func (l *LRU) set(key string, value any, ttl time.Duration) error {
	var expires time.Time
	if ttl > 0 {
		expires = time.Now().Add(ttl)
	}
	var buf []byte
	var err error
	if msgpVal, ok := value.(msgp.Marshaler); ok {
		buf, err = msgpVal.MarshalMsg(nil)
	} else {
		buf, err = msgpack.Marshal(value)
	}
	if err != nil {
		return err
	}
	l.lock.Lock()
	defer l.lock.Unlock()
	if ent, ok := l.items[key]; ok {
		l.evictList.MoveToFront(ent)
		e := ent.Value.(*entry)
		e.value = buf
		e.expires = expires
		if e.generation != l.currentGeneration {
			e.generation = l.currentGeneration
			l.len++
		}
		return nil
	}
	ent := &entry{key, buf, expires, l.currentGeneration}
	entry := l.evictList.PushFront(ent)
	l.items[key] = entry
	l.len++
	if l.evictList.Len() > l.size {
		l.removeElement(l.evictList.Back())
	}
	return nil
}
func (l *LRU) get(key string, value any) error {
	val, err := l.getItem(key)
	if err != nil {
		return err
	}
	if msgpVal, ok := value.(msgp.Unmarshaler); ok {
		_, err := msgpVal.UnmarshalMsg(val)
		return err
	}
	return msgpack.Unmarshal(val, value)
}
func (l *LRU) getItem(key string) ([]byte, error) {
	l.lock.Lock()
	defer l.lock.Unlock()
	ent, ok := l.items[key]
	if !ok {
		return nil, ErrKeyNotFound
	}
	e := ent.Value.(*entry)
	if e.generation != l.currentGeneration || (!e.expires.IsZero() && time.Now().After(e.expires)) {
		l.removeElement(ent)
		return nil, ErrKeyNotFound
	}
	l.evictList.MoveToFront(ent)
	return e.value, nil
}
func (l *LRU) removeElement(e *list.Element) {
	l.evictList.Remove(e)
	kv := e.Value.(*entry)
	if kv.generation == l.currentGeneration {
		l.len--
	}
	delete(l.items, kv.key)
}