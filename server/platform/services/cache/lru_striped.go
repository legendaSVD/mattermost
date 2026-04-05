package cache
import (
	"errors"
	"fmt"
	"math"
	"time"
	"github.com/cespare/xxhash/v2"
	"github.com/mattermost/mattermost/server/public/model"
)
type LRUStriped struct {
	buckets                []*LRU
	name                   string
	invalidateClusterEvent model.ClusterEvent
}
func (L LRUStriped) hashkeyMapHash(key string) uint64 {
	return xxhash.Sum64String(key)
}
func (L LRUStriped) keyBucket(key string) *LRU {
	return L.buckets[L.hashkeyMapHash(key)%uint64(len(L.buckets))]
}
func (L LRUStriped) Purge() error {
	for _, lru := range L.buckets {
		lru.Purge()
	}
	return nil
}
func (L LRUStriped) SetWithDefaultExpiry(key string, value any) error {
	return L.keyBucket(key).SetWithDefaultExpiry(key, value)
}
func (L LRUStriped) SetWithExpiry(key string, value any, ttl time.Duration) error {
	return L.keyBucket(key).SetWithExpiry(key, value, ttl)
}
func (L LRUStriped) Get(key string, value any) error {
	return L.keyBucket(key).Get(key, value)
}
func (L LRUStriped) GetMulti(keys []string, values []any) []error {
	errs := make([]error, 0, len(values))
	for i, key := range keys {
		errs = append(errs, L.keyBucket(key).Get(key, values[i]))
	}
	return errs
}
func (L LRUStriped) Remove(key string) error {
	return L.keyBucket(key).Remove(key)
}
func (L LRUStriped) RemoveMulti(keys []string) error {
	var err error
	for _, key := range keys {
		err = errors.Join(err, L.keyBucket(key).Remove(key))
	}
	return err
}
func (L LRUStriped) Scan(f func([]string) error) error {
	for _, lru := range L.buckets {
		lru.Scan(f)
	}
	return nil
}
func (L LRUStriped) Len() (int, error) {
	var size int
	for _, lru := range L.buckets {
		s, _ := lru.Len()
		size += s
	}
	return size, nil
}
func (L LRUStriped) GetInvalidateClusterEvent() model.ClusterEvent {
	return L.invalidateClusterEvent
}
func (L LRUStriped) Name() string {
	return L.name
}
func NewLRUStriped(opts *CacheOptions) (Cache, error) {
	if opts.StripedBuckets == 0 {
		return nil, fmt.Errorf("number of buckets is mandatory")
	}
	if opts.Size < opts.StripedBuckets {
		return nil, fmt.Errorf("cache size must at least be equal to the number of buckets")
	}
	opts.Size += int(math.Ceil(float64(opts.Size) * 10.0 / 100.0))
	opts.Size = (opts.Size / opts.StripedBuckets) + (opts.Size % opts.StripedBuckets)
	buckets := make([]*LRU, opts.StripedBuckets)
	for i := 0; i < opts.StripedBuckets; i++ {
		buckets[i] = NewLRU(opts).(*LRU)
	}
	return LRUStriped{
		buckets:                buckets,
		invalidateClusterEvent: opts.InvalidateClusterEvent,
		name:                   opts.Name,
	}, nil
}