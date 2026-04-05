package config
import (
	"fmt"
	"github.com/pkg/errors"
	"github.com/mattermost/mattermost/server/public/model"
)
type MemoryStore struct {
	allowEnvironmentOverrides bool
	validate                  bool
	files                     map[string][]byte
	savedConfig               *model.Config
}
type MemoryStoreOptions struct {
	IgnoreEnvironmentOverrides bool
	SkipValidation             bool
	InitialConfig              *model.Config
	InitialFiles               map[string][]byte
}
func NewMemoryStore() (*MemoryStore, error) {
	return NewMemoryStoreWithOptions(&MemoryStoreOptions{})
}
func NewMemoryStoreWithOptions(options *MemoryStoreOptions) (*MemoryStore, error) {
	savedConfig := options.InitialConfig
	if savedConfig == nil {
		savedConfig = &model.Config{}
		savedConfig.SetDefaults()
	}
	initialFiles := options.InitialFiles
	if initialFiles == nil {
		initialFiles = make(map[string][]byte)
	}
	ms := &MemoryStore{
		allowEnvironmentOverrides: !options.IgnoreEnvironmentOverrides,
		validate:                  !options.SkipValidation,
		files:                     initialFiles,
		savedConfig:               savedConfig,
	}
	return ms, nil
}
func (ms *MemoryStore) Set(newCfg *model.Config) error {
	return ms.persist(newCfg)
}
func (ms *MemoryStore) persist(cfg *model.Config) error {
	ms.savedConfig = cfg.Clone()
	return nil
}
func (ms *MemoryStore) Load() ([]byte, error) {
	cfgBytes, err := marshalConfig(ms.savedConfig)
	if err != nil {
		return nil, errors.Wrap(err, "failed to serialize config")
	}
	return cfgBytes, nil
}
func (ms *MemoryStore) GetFile(name string) ([]byte, error) {
	data, ok := ms.files[name]
	if !ok {
		return nil, fmt.Errorf("file %s not stored", name)
	}
	return data, nil
}
func (ms *MemoryStore) SetFile(name string, data []byte) error {
	ms.files[name] = data
	return nil
}
func (ms *MemoryStore) HasFile(name string) (bool, error) {
	_, ok := ms.files[name]
	return ok, nil
}
func (ms *MemoryStore) RemoveFile(name string) error {
	delete(ms.files, name)
	return nil
}
func (ms *MemoryStore) String() string {
	return "memory://"
}
func (ms *MemoryStore) Close() error {
	return nil
}