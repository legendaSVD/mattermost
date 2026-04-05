package pluginapi
import (
	"encoding/json"
	"fmt"
	"strings"
	"time"
	"github.com/pkg/errors"
	"github.com/mattermost/mattermost/server/public/model"
	"github.com/mattermost/mattermost/server/public/plugin"
)
const numRetries = 5
type KVService struct {
	api plugin.API
}
type KVSetOptions struct {
	model.PluginKVSetOptions
	oldValue any
}
type KVSetOption func(*KVSetOptions)
func SetAtomic(oldValue any) KVSetOption {
	return func(o *KVSetOptions) {
		o.Atomic = true
		o.oldValue = oldValue
	}
}
func SetExpiry(ttl time.Duration) KVSetOption {
	return func(o *KVSetOptions) {
		o.ExpireInSeconds = int64(ttl / time.Second)
	}
}
func (k *KVService) Set(key string, value any, options ...KVSetOption) (bool, error) {
	if strings.HasPrefix(key, internalKeyPrefix) {
		return false, errors.Errorf("'%s' prefix is not allowed for keys", internalKeyPrefix)
	}
	opts := KVSetOptions{}
	for _, o := range options {
		o(&opts)
	}
	var valueBytes []byte
	if value != nil {
		var isValueInBytes bool
		valueBytes, isValueInBytes = value.([]byte)
		if !isValueInBytes {
			var err error
			valueBytes, err = json.Marshal(value)
			if err != nil {
				return false, errors.Wrapf(err, "failed to marshal value %v", value)
			}
		}
	}
	downstreamOpts := model.PluginKVSetOptions{
		Atomic:          opts.Atomic,
		ExpireInSeconds: opts.ExpireInSeconds,
	}
	if opts.oldValue != nil {
		oldValueBytes, isOldValueInBytes := opts.oldValue.([]byte)
		if isOldValueInBytes {
			downstreamOpts.OldValue = oldValueBytes
		} else {
			data, err := json.Marshal(opts.oldValue)
			if err != nil {
				return false, errors.Wrapf(err, "failed to marshal value %v", opts.oldValue)
			}
			downstreamOpts.OldValue = data
		}
	}
	written, appErr := k.api.KVSetWithOptions(key, valueBytes, downstreamOpts)
	return written, normalizeAppErr(appErr)
}
func (k *KVService) SetAtomicWithRetries(key string, valueFunc func(oldValue []byte) (newValue any, err error)) error {
	for range numRetries {
		var oldVal []byte
		if err := k.Get(key, &oldVal); err != nil {
			return errors.Wrapf(err, "failed to get value for key %s", key)
		}
		newVal, err := valueFunc(oldVal)
		if err != nil {
			return errors.Wrap(err, "valueFunc failed")
		}
		if saved, err := k.Set(key, newVal, SetAtomic(oldVal)); err != nil {
			return errors.Wrapf(err, "DB failed to set value for key %s", key)
		} else if saved {
			return nil
		}
		time.Sleep(10 * time.Millisecond)
	}
	return fmt.Errorf("failed to set value after %d retries", numRetries)
}
func (k *KVService) Get(key string, o any) error {
	data, appErr := k.api.KVGet(key)
	if appErr != nil {
		return normalizeAppErr(appErr)
	}
	if len(data) == 0 {
		return nil
	}
	if bytesOut, ok := o.(*[]byte); ok {
		*bytesOut = data
		return nil
	}
	if err := json.Unmarshal(data, o); err != nil {
		return errors.Wrapf(err, "failed to unmarshal value for key %s", key)
	}
	return nil
}
func (k *KVService) Delete(key string) error {
	_, err := k.Set(key, nil)
	return err
}
func (k *KVService) DeleteAll() error {
	return normalizeAppErr(k.api.KVDeleteAll())
}
type ListKeysOption func(*listKeysOptions)
type listKeysOptions struct {
	checkers []func(key string) (keep bool, err error)
}
func (o *listKeysOptions) checkAll(key string) (keep bool, err error) {
	for _, check := range o.checkers {
		keep, err := check(key)
		if err != nil {
			return false, err
		}
		if !keep {
			return false, nil
		}
	}
	return true, nil
}
func WithPrefix(prefix string) ListKeysOption {
	return WithChecker(func(key string) (keep bool, err error) {
		return strings.HasPrefix(key, prefix), nil
	})
}
func WithChecker(f func(key string) (keep bool, err error)) ListKeysOption {
	return func(args *listKeysOptions) {
		args.checkers = append(args.checkers, f)
	}
}
func (k *KVService) ListKeys(page, count int, options ...ListKeysOption) ([]string, error) {
	args := &listKeysOptions{
		checkers: nil,
	}
	for _, opt := range options {
		opt(args)
	}
	keys, appErr := k.api.KVList(page, count)
	if appErr != nil {
		return nil, normalizeAppErr(appErr)
	}
	if len(args.checkers) == 0 {
		return keys, nil
	}
	ret := make([]string, 0)
	for _, key := range keys {
		keep, err := args.checkAll(key)
		if err != nil {
			return nil, err
		}
		if !keep {
			continue
		}
		ret = append(ret, key)
	}
	return ret, nil
}