package app
import (
	"github.com/mattermost/mattermost/server/public/model"
	"github.com/mattermost/mattermost/server/public/shared/mlog"
	"github.com/mattermost/mattermost/server/v8/channels/app/platform"
	"github.com/mattermost/mattermost/server/v8/channels/store"
	"github.com/mattermost/mattermost/server/v8/channels/store/sqlstore"
	"github.com/mattermost/mattermost/server/v8/config"
	"github.com/mattermost/mattermost/server/v8/einterfaces"
	"github.com/mattermost/mattermost/server/v8/platform/shared/filestore"
)
type Option func(s *Server) error
func StoreOverride(override any) Option {
	return func(s *Server) error {
		s.platformOptions = append(s.platformOptions, platform.StoreOverride(override))
		return nil
	}
}
func StoreOverrideWithCache(override store.Store) Option {
	return func(s *Server) error {
		s.platformOptions = append(s.platformOptions, platform.StoreOverrideWithCache(override))
		return nil
	}
}
func StoreOption(option sqlstore.Option) Option {
	return func(s *Server) error {
		s.platformOptions = append(s.platformOptions, platform.StoreOption(option))
		return nil
	}
}
func Config(dsn string, readOnly bool, configDefaults *model.Config) Option {
	return func(s *Server) error {
		s.platformOptions = append(s.platformOptions, platform.Config(dsn, readOnly, configDefaults))
		return nil
	}
}
func ConfigStore(configStore *config.Store) Option {
	return func(s *Server) error {
		s.platformOptions = append(s.platformOptions, platform.ConfigStore(configStore))
		return nil
	}
}
func SetFileStore(filestore filestore.FileBackend) Option {
	return func(s *Server) error {
		s.platformOptions = append(s.platformOptions, platform.SetFileStore(filestore))
		return nil
	}
}
func ForceEnableRedis() Option {
	return func(s *Server) error {
		s.platformOptions = append(s.platformOptions, platform.ForceEnableRedis())
		return nil
	}
}
func RunEssentialJobs(s *Server) error {
	s.runEssentialJobs = true
	return nil
}
func JoinCluster(s *Server) error {
	s.joinCluster = true
	return nil
}
func StartMetrics(s *Server) error {
	s.platformOptions = append(s.platformOptions, platform.StartMetrics())
	return nil
}
func WithLicense(license *model.License) Option {
	return func(s *Server) error {
		s.platformOptions = append(s.platformOptions, func(p *platform.PlatformService) error {
			p.SetLicense(license)
			return nil
		})
		return nil
	}
}
func SetLogger(logger *mlog.Logger) Option {
	return func(s *Server) error {
		s.platformOptions = append(s.platformOptions, platform.SetLogger(logger))
		return nil
	}
}
func SkipPostInitialization() Option {
	return func(s *Server) error {
		s.skipPostInit = true
		return nil
	}
}
type (
	AppOption        func(a *App)
	AppOptionCreator func() []AppOption
)
func ServerConnector(ch *Channels) AppOption {
	return func(a *App) {
		a.ch = ch
	}
}
func SetCluster(impl einterfaces.ClusterInterface) Option {
	return func(s *Server) error {
		s.platformOptions = append(s.platformOptions, platform.SetCluster(impl))
		return nil
	}
}