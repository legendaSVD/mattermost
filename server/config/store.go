package config
import (
	"encoding/json"
	"reflect"
	"sync"
	"time"
	"github.com/pkg/errors"
	"github.com/mattermost/mattermost/server/public/model"
	"github.com/mattermost/mattermost/server/public/shared/i18n"
	"github.com/mattermost/mattermost/server/public/utils"
)
var (
	ErrReadOnlyStore = errors.New("configuration store is read-only")
)
type Store struct {
	emitter
	backingStore BackingStore
	configLock           sync.RWMutex
	config               *model.Config
	configNoEnv          *model.Config
	configCustomDefaults *model.Config
	readOnly   bool
	readOnlyFF bool
}
type BackingStore interface {
	Set(*model.Config) error
	Load() ([]byte, error)
	GetFile(name string) ([]byte, error)
	SetFile(name string, data []byte) error
	HasFile(name string) (bool, error)
	RemoveFile(name string) error
	String() string
	Close() error
}
func NewStoreFromBacking(backingStore BackingStore, customDefaults *model.Config, readOnly bool) (*Store, error) {
	store := &Store{
		backingStore:         backingStore,
		configCustomDefaults: customDefaults,
		readOnly:             readOnly,
		readOnlyFF:           true,
	}
	if err := store.Load(); err != nil {
		return nil, errors.Wrap(err, "unable to load on store creation")
	}
	return store, nil
}
func NewStoreFromDSN(dsn string, readOnly bool, customDefaults *model.Config, createFileIfNotExist bool) (*Store, error) {
	var err error
	var backingStore BackingStore
	if IsDatabaseDSN(dsn) {
		backingStore, err = NewDatabaseStore(dsn)
	} else {
		backingStore, err = NewFileStore(dsn, createFileIfNotExist)
	}
	if err != nil {
		return nil, err
	}
	store, err := NewStoreFromBacking(backingStore, customDefaults, readOnly)
	if err != nil {
		backingStore.Close()
		return nil, errors.Wrap(err, "failed to create store")
	}
	return store, nil
}
func NewTestMemoryStore() *Store {
	memoryStore, err := NewMemoryStore()
	if err != nil {
		panic("failed to initialize memory store: " + err.Error())
	}
	configStore, err := NewStoreFromBacking(memoryStore, nil, false)
	if err != nil {
		panic("failed to initialize config store: " + err.Error())
	}
	return configStore
}
func (s *Store) Get() *model.Config {
	s.configLock.RLock()
	defer s.configLock.RUnlock()
	return s.config
}
func (s *Store) GetNoEnv() *model.Config {
	s.configLock.RLock()
	defer s.configLock.RUnlock()
	return s.configNoEnv
}
func (s *Store) GetEnvironmentOverrides() map[string]any {
	return generateEnvironmentMap(GetEnvironment(), nil)
}
func (s *Store) GetEnvironmentOverridesWithFilter(filter func(reflect.StructField) bool) map[string]any {
	return generateEnvironmentMap(GetEnvironment(), filter)
}
func (s *Store) RemoveEnvironmentOverrides(cfg *model.Config) *model.Config {
	s.configLock.RLock()
	defer s.configLock.RUnlock()
	return removeEnvOverrides(cfg, s.configNoEnv, s.GetEnvironmentOverrides())
}
func (s *Store) SetReadOnlyFF(readOnly bool) {
	s.configLock.Lock()
	defer s.configLock.Unlock()
	s.readOnlyFF = readOnly
}
func (s *Store) Set(newCfg *model.Config) (*model.Config, *model.Config, error) {
	s.configLock.Lock()
	defer s.configLock.Unlock()
	if s.readOnly {
		return nil, nil, ErrReadOnlyStore
	}
	newCfg = newCfg.Clone()
	oldCfg := s.config.Clone()
	oldCfgNoEnv := s.configNoEnv
	newCfg.SetDefaults()
	desanitize(oldCfg, newCfg)
	newCfg = applyEnvironmentMap(newCfg, GetEnvironment())
	fixConfig(newCfg)
	if err := newCfg.IsValid(); err != nil {
		return nil, nil, errors.Wrap(err, "new configuration is invalid")
	}
	newCfgNoEnv := removeEnvOverrides(newCfg, oldCfgNoEnv, s.GetEnvironmentOverrides())
	oldCfgFF := oldCfg.FeatureFlags
	oldCfgNoEnvFF := oldCfgNoEnv.FeatureFlags
	if s.readOnlyFF {
		oldCfg.FeatureFlags = nil
		newCfg.FeatureFlags = nil
		newCfgNoEnv.FeatureFlags = nil
	}
	if err := s.backingStore.Set(newCfgNoEnv); err != nil {
		return nil, nil, errors.Wrap(err, "failed to persist")
	}
	hasChanged, err := equal(oldCfg, newCfg)
	if err != nil {
		return nil, nil, errors.Wrap(err, "failed to compare configs")
	}
	if s.readOnlyFF {
		oldCfg.FeatureFlags = oldCfgFF
		newCfg.FeatureFlags = oldCfgFF
		newCfgNoEnv.FeatureFlags = oldCfgNoEnvFF
	}
	s.configNoEnv = newCfgNoEnv
	s.config = newCfg
	newCfgCopy := newCfg.Clone()
	if hasChanged {
		s.configLock.Unlock()
		s.invokeConfigListeners(oldCfg, newCfgCopy.Clone())
		s.configLock.Lock()
	}
	return oldCfg, newCfgCopy, nil
}
func (s *Store) Load() error {
	s.configLock.Lock()
	defer s.configLock.Unlock()
	oldCfg := &model.Config{}
	if s.config != nil {
		oldCfg = s.config.Clone()
	}
	configBytes, err := s.backingStore.Load()
	if err != nil {
		return err
	}
	loadedCfg := &model.Config{}
	if len(configBytes) != 0 {
		if err = json.Unmarshal(configBytes, &loadedCfg); err != nil {
			return utils.HumanizeJSONError(err, configBytes)
		}
	}
	if s.configCustomDefaults != nil {
		var mErr error
		loadedCfg, mErr = Merge(s.configCustomDefaults, loadedCfg, nil)
		if mErr != nil {
			return errors.Wrap(mErr, "failed to merge custom config defaults")
		}
		s.configCustomDefaults = nil
	}
	if loadedCfg.ServiceSettings.SiteURL == nil {
		loadedCfg.ServiceSettings.SiteURL = model.NewPointer("")
	}
	loadedCfg.SetDefaults()
	loadedCfgNoEnv := loadedCfg
	fixConfig(loadedCfgNoEnv)
	loadedCfg = applyEnvironmentMap(loadedCfg, GetEnvironment())
	fixConfig(loadedCfg)
	if appErr := loadedCfg.IsValid(); appErr != nil {
		appErr.Translate(i18n.GetUserTranslations("en"))
		return errors.Wrap(appErr, "invalid config")
	}
	oldCfgFF := oldCfg.FeatureFlags
	loadedCfgFF := loadedCfg.FeatureFlags
	loadedCfgNoEnvFF := loadedCfgNoEnv.FeatureFlags
	if s.readOnlyFF {
		oldCfg.FeatureFlags = nil
		loadedCfg.FeatureFlags = nil
		loadedCfgNoEnv.FeatureFlags = nil
	}
	hasChanged, err := equal(oldCfg, loadedCfg)
	if err != nil {
		return errors.Wrap(err, "failed to compare configs")
	}
	if !s.readOnly && (hasChanged || len(configBytes) == 0) {
		err := s.backingStore.Set(loadedCfgNoEnv)
		if err != nil && !errors.Is(err, ErrReadOnlyConfiguration) {
			return errors.Wrap(err, "failed to persist")
		}
	}
	if s.readOnlyFF {
		oldCfg.FeatureFlags = oldCfgFF
		loadedCfg.FeatureFlags = loadedCfgFF
		loadedCfgNoEnv.FeatureFlags = loadedCfgNoEnvFF
	}
	s.config = loadedCfg
	s.configNoEnv = loadedCfgNoEnv
	loadedCfgCopy := loadedCfg.Clone()
	if hasChanged {
		s.configLock.Unlock()
		s.invokeConfigListeners(oldCfg, loadedCfgCopy)
		s.configLock.Lock()
	}
	return nil
}
func (s *Store) GetFile(name string) ([]byte, error) {
	s.configLock.RLock()
	defer s.configLock.RUnlock()
	return s.backingStore.GetFile(name)
}
func (s *Store) SetFile(name string, data []byte) error {
	s.configLock.Lock()
	defer s.configLock.Unlock()
	if s.readOnly {
		return ErrReadOnlyStore
	}
	return s.backingStore.SetFile(name, data)
}
func (s *Store) HasFile(name string) (bool, error) {
	s.configLock.RLock()
	defer s.configLock.RUnlock()
	return s.backingStore.HasFile(name)
}
func (s *Store) RemoveFile(name string) error {
	s.configLock.Lock()
	defer s.configLock.Unlock()
	if s.readOnly {
		return ErrReadOnlyStore
	}
	return s.backingStore.RemoveFile(name)
}
func (s *Store) String() string {
	return s.backingStore.String()
}
func (s *Store) Close() error {
	s.configLock.Lock()
	defer s.configLock.Unlock()
	return s.backingStore.Close()
}
func (s *Store) IsReadOnly() bool {
	s.configLock.RLock()
	defer s.configLock.RUnlock()
	return s.readOnly
}
func (s *Store) CleanUp() error {
	switch bs := s.backingStore.(type) {
	case *DatabaseStore:
		dur := time.Duration(*s.config.JobSettings.CleanupConfigThresholdDays) * time.Hour * 24
		expiry := model.GetMillisForTime(time.Now().Add(-dur))
		return bs.cleanUp(expiry)
	default:
		return nil
	}
}