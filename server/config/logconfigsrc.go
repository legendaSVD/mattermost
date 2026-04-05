package config
import (
	"encoding/json"
	"errors"
	"path/filepath"
	"strconv"
	"strings"
	"sync"
	"github.com/mattermost/mattermost/server/public/shared/mlog"
)
const (
	LogConfigSrcTypeJSON LogConfigSrcType = "json"
	LogConfigSrcTypeFile LogConfigSrcType = "file"
)
type LogSrcListener func(oldCfg, newCfg mlog.LoggerConfiguration)
type LogConfigSrcType string
type LogConfigSrc interface {
	Get() mlog.LoggerConfiguration
	Set(dsn []byte, configStore *Store) (err error)
	GetType() LogConfigSrcType
	Close() error
}
func NewLogConfigSrc(dsn json.RawMessage, configStore *Store) (LogConfigSrc, error) {
	if len(dsn) == 0 {
		return nil, errors.New("dsn should not be empty")
	}
	if configStore == nil {
		return nil, errors.New("configStore should not be nil")
	}
	if isJSONMap(dsn) {
		return newJSONSrc(dsn)
	}
	str := strings.TrimSpace(string(dsn))
	if s, err := strconv.Unquote(str); err == nil {
		str = s
	}
	strBytes := []byte(str)
	if isJSONMap(strBytes) {
		return newJSONSrc(strBytes)
	}
	path := str
	if strings.HasPrefix(configStore.String(), "file://") && !filepath.IsAbs(path) {
		configPath := strings.TrimPrefix(configStore.String(), "file://")
		path = filepath.Join(filepath.Dir(configPath), path)
	}
	return newFileSrc(path, configStore)
}
type jsonSrc struct {
	logSrcEmitter
	mutex sync.RWMutex
	cfg   mlog.LoggerConfiguration
}
func newJSONSrc(data json.RawMessage) (*jsonSrc, error) {
	src := &jsonSrc{}
	return src, src.Set(data, nil)
}
func (src *jsonSrc) Get() mlog.LoggerConfiguration {
	src.mutex.RLock()
	defer src.mutex.RUnlock()
	return src.cfg
}
func (src *jsonSrc) Set(data []byte, _ *Store) error {
	cfg, err := logTargetCfgFromJSON(data)
	if err != nil {
		return err
	}
	src.set(cfg)
	return nil
}
func (src *jsonSrc) GetType() LogConfigSrcType {
	return LogConfigSrcTypeJSON
}
func (src *jsonSrc) set(cfg mlog.LoggerConfiguration) {
	src.mutex.Lock()
	defer src.mutex.Unlock()
	old := src.cfg
	src.cfg = cfg
	src.invokeConfigListeners(old, cfg)
}
func (src *jsonSrc) Close() error {
	return nil
}
type fileSrc struct {
	mutex sync.RWMutex
	cfg   mlog.LoggerConfiguration
	path  string
}
func newFileSrc(path string, configStore *Store) (*fileSrc, error) {
	src := &fileSrc{
		path: path,
	}
	if err := src.Set([]byte(path), configStore); err != nil {
		return nil, err
	}
	return src, nil
}
func (src *fileSrc) Get() mlog.LoggerConfiguration {
	src.mutex.RLock()
	defer src.mutex.RUnlock()
	return src.cfg
}
func (src *fileSrc) Set(path []byte, configStore *Store) error {
	data, err := configStore.GetFile(string(path))
	if err != nil {
		return err
	}
	cfg, err := logTargetCfgFromJSON(data)
	if err != nil {
		return err
	}
	src.set(cfg)
	return nil
}
func (src *fileSrc) GetType() LogConfigSrcType {
	return LogConfigSrcTypeFile
}
func (src *fileSrc) set(cfg mlog.LoggerConfiguration) {
	src.mutex.Lock()
	defer src.mutex.Unlock()
	src.cfg = cfg
}
func (src *fileSrc) Close() error {
	return nil
}
func logTargetCfgFromJSON(data []byte) (mlog.LoggerConfiguration, error) {
	cfg := make(mlog.LoggerConfiguration)
	err := json.Unmarshal(data, &cfg)
	if err != nil {
		return nil, err
	}
	return cfg, nil
}