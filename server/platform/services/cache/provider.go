package cache
import (
	"context"
	"fmt"
	"time"
	"github.com/mattermost/mattermost/server/public/model"
	"github.com/mattermost/mattermost/server/v8/einterfaces"
	"github.com/redis/rueidis"
)
type CacheOptions struct {
	Size                   int
	DefaultExpiry          time.Duration
	Name                   string
	InvalidateClusterEvent model.ClusterEvent
	Striped                bool
	StripedBuckets int
}
type Provider interface {
	NewCache(opts *CacheOptions) (Cache, error)
	Connect() (string, error)
	SetMetrics(metrics einterfaces.MetricsInterface)
	Close() error
	Type() string
}
type cacheProvider struct {
}
func NewProvider() Provider {
	return &cacheProvider{}
}
func (c *cacheProvider) NewCache(opts *CacheOptions) (Cache, error) {
	if opts.Striped {
		return NewLRUStriped(opts)
	}
	return NewLRU(opts), nil
}
func (c *cacheProvider) Connect() (string, error) {
	return "OK", nil
}
func (c *cacheProvider) SetMetrics(metrics einterfaces.MetricsInterface) {
}
func (c *cacheProvider) Close() error {
	return nil
}
func (c *cacheProvider) Type() string {
	return model.CacheTypeLRU
}
type redisProvider struct {
	client      rueidis.Client
	cachePrefix string
	metrics     einterfaces.MetricsInterface
}
type RedisOptions struct {
	RedisAddr        string
	RedisPassword    string
	RedisDB          int
	RedisCachePrefix string
	DisableCache     bool
}
func NewRedisProvider(opts *RedisOptions) (Provider, error) {
	client, err := rueidis.NewClient(rueidis.ClientOption{
		InitAddress:       []string{opts.RedisAddr},
		Password:          opts.RedisPassword,
		SelectDB:          opts.RedisDB,
		ForceSingleClient: true,
		CacheSizeEachConn: 32 * (1 << 20),
		DisableCache:      opts.DisableCache,
		MaxFlushDelay: 250 * time.Microsecond,
		DisableRetry:  true,
		ConnWriteTimeout: 5 * time.Second,
	})
	if err != nil {
		return nil, err
	}
	return &redisProvider{client: client, cachePrefix: opts.RedisCachePrefix}, nil
}
func (r *redisProvider) NewCache(opts *CacheOptions) (Cache, error) {
	if r.cachePrefix != "" {
		opts.Name = r.cachePrefix + ":" + opts.Name
	}
	rr, err := NewRedis(opts, r.client)
	rr.metrics = r.metrics
	return rr, err
}
func (r *redisProvider) Connect() (string, error) {
	res, err := r.client.Do(context.Background(), r.client.B().Ping().Build()).ToString()
	if err != nil {
		return "", fmt.Errorf("unable to establish connection with redis: %v", err)
	}
	return res, nil
}
func (r *redisProvider) SetMetrics(metrics einterfaces.MetricsInterface) {
	r.metrics = metrics
}
func (r *redisProvider) Type() string {
	return model.CacheTypeRedis
}
func (r *redisProvider) Close() error {
	r.client.Close()
	return nil
}