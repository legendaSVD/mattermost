package config
import (
	"fmt"
	"io"
	"os"
	"path/filepath"
	"github.com/pkg/errors"
	"github.com/mattermost/mattermost/server/public/model"
	"github.com/mattermost/mattermost/server/public/shared/mlog"
	"github.com/mattermost/mattermost/server/v8/channels/utils/fileutils"
)
var (
	ErrReadOnlyConfiguration = errors.New("configuration is read-only")
)
type FileStore struct {
	path string
}
func NewFileStore(path string, createFileIfNotExists bool) (fs *FileStore, err error) {
	resolvedPath, err := resolveConfigFilePath(path)
	if err != nil {
		return nil, err
	}
	f, err := os.Open(resolvedPath)
	if err != nil && errors.Is(err, os.ErrNotExist) && createFileIfNotExists {
		file, err2 := os.Create(resolvedPath)
		if err2 != nil {
			return nil, fmt.Errorf("could not create config file: %w", err2)
		}
		defer file.Close()
	} else if err != nil {
		return nil, err
	} else {
		defer f.Close()
	}
	return &FileStore{
		path: resolvedPath,
	}, nil
}
func resolveConfigFilePath(path string) (string, error) {
	if filepath.IsAbs(path) {
		return path, nil
	}
	if configFile := fileutils.FindFile(filepath.Join("channels/config", path)); configFile != "" {
		return configFile, nil
	}
	if configFile := fileutils.FindFile(filepath.Join("config", path)); configFile != "" {
		return configFile, nil
	}
	if configFile := fileutils.FindPath(path, []string{"."}, nil); configFile != "" {
		return configFile, nil
	}
	if configFolder, found := fileutils.FindDir("config"); found {
		return filepath.Join(configFolder, path), nil
	}
	return "", fmt.Errorf("failed to find config file %s", path)
}
func (fs *FileStore) resolveFilePath(name string) string {
	if filepath.IsAbs(name) {
		return name
	}
	return filepath.Join(filepath.Dir(fs.path), name)
}
func (fs *FileStore) Set(newCfg *model.Config) error {
	if *newCfg.ClusterSettings.Enable && *newCfg.ClusterSettings.ReadOnlyConfig {
		return ErrReadOnlyConfiguration
	}
	return fs.persist(newCfg)
}
func (fs *FileStore) persist(cfg *model.Config) error {
	b, err := marshalConfig(cfg)
	if err != nil {
		return errors.Wrap(err, "failed to serialize")
	}
	err = os.WriteFile(fs.path, b, 0600)
	if err != nil {
		return errors.Wrap(err, "failed to write file")
	}
	return nil
}
func (fs *FileStore) Load() ([]byte, error) {
	f, err := os.Open(fs.path)
	if os.IsNotExist(err) {
		return nil, nil
	} else if err != nil {
		return nil, errors.Wrapf(err, "failed to open %s for reading", fs.path)
	}
	defer f.Close()
	fileBytes, err := io.ReadAll(f)
	if err != nil {
		return nil, err
	}
	return fileBytes, nil
}
func (fs *FileStore) GetFile(name string) ([]byte, error) {
	resolvedPath := fs.resolveFilePath(name)
	data, err := os.ReadFile(resolvedPath)
	if err != nil {
		return nil, errors.Wrapf(err, "failed to read file from %s", resolvedPath)
	}
	return data, nil
}
func (fs *FileStore) GetFilePath(name string) string {
	return fs.resolveFilePath(name)
}
func (fs *FileStore) SetFile(name string, data []byte) error {
	resolvedPath := fs.resolveFilePath(name)
	err := os.WriteFile(resolvedPath, data, 0600)
	if err != nil {
		return errors.Wrapf(err, "failed to write file to %s", resolvedPath)
	}
	return nil
}
func (fs *FileStore) HasFile(name string) (bool, error) {
	if name == "" {
		return false, nil
	}
	resolvedPath := fs.resolveFilePath(name)
	_, err := os.Stat(resolvedPath)
	if err != nil && os.IsNotExist(err) {
		return false, nil
	} else if err != nil {
		return false, errors.Wrap(err, "failed to check if file exists")
	}
	return true, nil
}
func (fs *FileStore) RemoveFile(name string) error {
	if filepath.IsAbs(name) {
		mlog.Debug("Skipping removal of configuration file with absolute path", mlog.String("filename", name))
		return nil
	}
	resolvedPath := filepath.Join(filepath.Dir(fs.path), name)
	err := os.Remove(resolvedPath)
	if os.IsNotExist(err) {
		return nil
	}
	if err != nil {
		return errors.Wrap(err, "failed to remove file")
	}
	return nil
}
func (fs *FileStore) String() string {
	return "file://" + fs.path
}
func (fs *FileStore) Close() error {
	return nil
}