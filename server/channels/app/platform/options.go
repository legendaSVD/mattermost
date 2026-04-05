package platform
import (
	"fmt"
	"github.com/pkg/errors"
	"github.com/mattermost/mattermost/server/public/model"
	"github.com/mattermost/mattermost/server/public/shared/mlog"
	"github.com/mattermost/mattermost/server/v8/channels/store"
	"github.com/mattermost/mattermost/server/v8/channels/store/localcachelayer"
	"github.com/mattermost/mattermost/server/v8/channels/store/sqlstore"
	"github.com/mattermost/mattermost/server/v8/config"
	"github.com/mattermost/mattermost/server/v8/einterfaces"
	"github.com/mattermost/mattermost/server/v8/platform/shared/filestore"
)
type Option func(ps *PlatformService) error
func StoreOverride(override any) Option {
	return func(ps *PlatformService) error {
		switch o := override.(type) {
		case store.Store:
			ps.newStore = func() (store.Store, error) {
				return o, nil
			}
			return nil
		case func(*PlatformService) store.Store:
			ps.newStore = func() (store.Store, error) {
				return o(ps), nil
			}
			return nil
		default:
			return errors.New("invalid StoreOverride")
		}
	}
}
func StoreOverrideWithCache(override store.Store) Option {
	return func(ps *PlatformService) error {
		ps.newStore = func() (store.Store, error) {
			lcl, err := localcachelayer.NewLocalCacheLayer(override, ps.metricsIFace, ps.clusterIFace, ps.cacheProvider, ps.Log())
			if err != nil {
				return nil, err
			}
			lcl.Invalidate()
			return lcl, nil
		}
		return nil
	}
}
func StoreOption(option sqlstore.Option) Option {
	return func(ps *PlatformService) error {
		ps.storeOptions = append(ps.storeOptions, option)
		return nil
	}
}
func Config(dsn string, readOnly bool, configDefaults *model.Config) Option {
	return func(ps *PlatformService) error {
		configStore, err := config.NewStoreFromDSN(dsn, readOnly, configDefaults, true)
		if err != nil {
			return fmt.Errorf("failed to apply Config option: %w", err)
		}
		ps.configStore = configStore
		return nil
	}
}
func SetFileStore(filestore filestore.FileBackend) Option {
	return func(ps *PlatformService) error {
		ps.filestore = filestore
		return nil
	}
}
func SetExportFileStore(filestore filestore.FileBackend) Option {
	return func(ps *PlatformService) error {
		ps.exportFilestore = filestore
		return nil
	}
}
func ConfigStore(configStore *config.Store) Option {
	return func(ps *PlatformService) error {
		ps.configStore = configStore
		return nil
	}
}
func StartMetrics() Option {
	return func(ps *PlatformService) error {
		ps.startMetrics = true
		return nil
	}
}
func SetLogger(logger *mlog.Logger) Option {
	return func(ps *PlatformService) error {
		ps.SetLogger(logger)
		return nil
	}
}
func SetCluster(cluster einterfaces.ClusterInterface) Option {
	return func(ps *PlatformService) error {
		ps.clusterIFace = cluster
		return nil
	}
}
func ForceEnableRedis() Option {
	return func(ps *PlatformService) error {
		ps.forceEnableRedis = true
		return nil
	}
}