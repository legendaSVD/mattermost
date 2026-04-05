package model
import (
	"net/http"
)
type PluginKVSetOptions struct {
	Atomic          bool
	OldValue        []byte
	ExpireInSeconds int64
}
func (opt *PluginKVSetOptions) IsValid() *AppError {
	if !opt.Atomic && opt.OldValue != nil {
		return NewAppError(
			"PluginKVSetOptions.IsValid",
			"model.plugin_kvset_options.is_valid.old_value.app_error",
			nil,
			"",
			http.StatusBadRequest,
		)
	}
	return nil
}
func NewPluginKeyValueFromOptions(pluginId, key string, value []byte, opt PluginKVSetOptions) (*PluginKeyValue, *AppError) {
	expireAt := int64(0)
	if opt.ExpireInSeconds != 0 {
		expireAt = GetMillis() + (opt.ExpireInSeconds * 1000)
	}
	kv := &PluginKeyValue{
		PluginId: pluginId,
		Key:      key,
		Value:    value,
		ExpireAt: expireAt,
	}
	return kv, nil
}