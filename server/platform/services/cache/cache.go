package cache
import (
	"errors"
	"time"
	"github.com/mattermost/mattermost/server/public/model"
)
var ErrKeyNotFound = errors.New("key not found")
type Cache interface {
	Purge() error
	SetWithDefaultExpiry(key string, value any) error
	SetWithExpiry(key string, value any, ttl time.Duration) error
	Get(key string, value any) error
	GetMulti(keys []string, values []any) []error
	Remove(key string) error
	RemoveMulti(keys []string) error
	Scan(f func([]string) error) error
	GetInvalidateClusterEvent() model.ClusterEvent
	Name() string
}
type ExternalCache interface {
	Cache
	Increment(key string, val int) error
	Decrement(key string, val int) error
}