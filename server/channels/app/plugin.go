package app
import (
	"encoding/base64"
	"fmt"
	"io"
	"net/http"
	"os"
	"path/filepath"
	"runtime"
	"slices"
	"sort"
	"strings"
	"sync"
	"github.com/Masterminds/semver/v3"
	svg "github.com/h2non/go-is-svg"
	"github.com/pkg/errors"
	"github.com/mattermost/mattermost/server/public/model"
	"github.com/mattermost/mattermost/server/public/plugin"
	"github.com/mattermost/mattermost/server/public/shared/mlog"
	"github.com/mattermost/mattermost/server/public/shared/request"
	"github.com/mattermost/mattermost/server/v8/channels/utils/fileutils"
	"github.com/mattermost/mattermost/server/v8/platform/services/marketplace"
)
const prepackagedPluginsDir = "prepackaged_plugins"
type pluginSignaturePath struct {
	pluginID      string
	bundlePath    string
	signaturePath string
}
func (ch *Channels) GetPluginsEnvironment() *plugin.Environment {
	if !*ch.cfgSvc.Config().PluginSettings.Enable {
		return nil
	}
	ch.pluginsLock.RLock()
	defer ch.pluginsLock.RUnlock()
	return ch.pluginsEnvironment
}
func (a *App) GetPluginsEnvironment() *plugin.Environment {
	return a.ch.GetPluginsEnvironment()
}
func (ch *Channels) SetPluginsEnvironment(pluginsEnvironment *plugin.Environment) {
	ch.pluginsLock.Lock()
	defer ch.pluginsLock.Unlock()
	ch.pluginsEnvironment = pluginsEnvironment
	ch.srv.Platform().SetPluginsEnvironment(ch)
}
func (ch *Channels) syncPluginsActiveState() {
	ch.pluginsLock.RLock()
	pluginsEnvironment := ch.pluginsEnvironment
	ch.pluginsLock.RUnlock()
	if pluginsEnvironment == nil {
		return
	}
	config := ch.cfgSvc.Config().PluginSettings
	if *config.Enable {
		availablePlugins, err := pluginsEnvironment.Available()
		if err != nil {
			ch.srv.Log().Error("Unable to get available plugins", mlog.Err(err))
			return
		}
		disabledPlugins := []*model.BundleInfo{}
		enabledPlugins := []*model.BundleInfo{}
		for _, plugin := range availablePlugins {
			pluginID := plugin.Manifest.Id
			pluginEnabled := false
			if state, ok := config.PluginStates[pluginID]; ok {
				pluginEnabled = state.Enable
			}
			if hasOverride, value := ch.getPluginStateOverride(pluginID); hasOverride {
				pluginEnabled = value
			}
			if pluginEnabled {
				enabledPlugins = append(enabledPlugins, plugin)
			} else {
				disabledPlugins = append(disabledPlugins, plugin)
			}
		}
		var wg sync.WaitGroup
		for _, plugin := range disabledPlugins {
			wg.Add(1)
			go func(plugin *model.BundleInfo) {
				defer wg.Done()
				deactivated := pluginsEnvironment.Deactivate(plugin.Manifest.Id)
				if deactivated && plugin.Manifest.HasClient() {
					message := model.NewWebSocketEvent(model.WebsocketEventPluginDisabled, "", "", "", nil, "")
					message.Add("manifest", plugin.Manifest.ClientManifest())
					ch.srv.platform.Publish(message)
				}
			}(plugin)
		}
		for _, plugin := range enabledPlugins {
			wg.Add(1)
			go func(plugin *model.BundleInfo) {
				defer wg.Done()
				pluginID := plugin.Manifest.Id
				logger := ch.srv.Log().With(mlog.String("plugin_id", pluginID), mlog.String("bundle_path", plugin.Path))
				updatedManifest, activated, err := pluginsEnvironment.Activate(pluginID)
				if err != nil {
					logger.Error("Unable to activate plugin", mlog.Err(err))
					return
				}
				if activated {
					if err := ch.notifyPluginEnabled(updatedManifest); err != nil {
						logger.Error("Failed to notify cluster on plugin enable", mlog.Err(err))
					}
				}
			}(plugin)
		}
		wg.Wait()
	} else {
		pluginsEnvironment.Shutdown()
	}
	if err := ch.notifyPluginStatusesChanged(); err != nil {
		ch.srv.Log().Warn("failed to notify plugin status changed", mlog.Err(err))
	}
}
func (a *App) NewPluginAPI(rctx request.CTX, manifest *model.Manifest) plugin.API {
	return NewPluginAPI(a, rctx, manifest)
}
func (a *App) InitPlugins(rctx request.CTX, pluginDir, webappPluginDir string) {
	a.ch.initPlugins(rctx, pluginDir, webappPluginDir)
}
func (ch *Channels) initPlugins(rctx request.CTX, pluginDir, webappPluginDir string) {
	defer func() {
		ch.srv.Platform().SetPluginsEnvironment(ch)
	}()
	ch.pluginsLock.RLock()
	pluginsEnvironment := ch.pluginsEnvironment
	ch.pluginsLock.RUnlock()
	if pluginsEnvironment != nil || !*ch.cfgSvc.Config().PluginSettings.Enable {
		ch.syncPluginsActiveState()
		if pluginsEnvironment != nil {
			pluginsEnvironment.TogglePluginHealthCheckJob(*ch.cfgSvc.Config().PluginSettings.EnableHealthCheck)
		}
		return
	}
	ch.srv.Log().Info("Starting up plugins")
	if err := os.Mkdir(pluginDir, 0744); err != nil && !os.IsExist(err) {
		ch.srv.Log().Error("Failed to start up plugins", mlog.Err(err))
		return
	}
	if err := os.Mkdir(webappPluginDir, 0744); err != nil && !os.IsExist(err) {
		ch.srv.Log().Error("Failed to start up plugins", mlog.Err(err))
		return
	}
	newAPIFunc := func(manifest *model.Manifest) plugin.API {
		return New(ServerConnector(ch)).NewPluginAPI(rctx, manifest)
	}
	env, err := plugin.NewEnvironment(
		newAPIFunc,
		NewDriverImpl(ch.srv),
		pluginDir,
		webappPluginDir,
		ch.srv.Log(),
		ch.srv.GetMetrics(),
	)
	if err != nil {
		ch.srv.Log().Error("Failed to start up plugins", mlog.Err(err))
		return
	}
	ch.pluginsLock.Lock()
	ch.pluginsEnvironment = env
	ch.pluginsLock.Unlock()
	ch.pluginsEnvironment.TogglePluginHealthCheckJob(*ch.cfgSvc.Config().PluginSettings.EnableHealthCheck)
	if err := ch.syncPlugins(); err != nil {
		ch.srv.Log().Error("Failed to sync plugins from the file store", mlog.Err(err))
	}
	if err := ch.processPrepackagedPlugins(prepackagedPluginsDir); err != nil {
		ch.srv.Log().Error("Failed to process prepackaged plugins", mlog.Err(err))
	}
	ch.pluginClusterLeaderListenerID = ch.srv.AddClusterLeaderChangedListener(func() {
		ch.persistTransitionallyPrepackagedPlugins()
	})
	ch.persistTransitionallyPrepackagedPlugins()
	ch.pluginsLock.Lock()
	ch.RemoveConfigListener(ch.pluginConfigListenerID)
	ch.pluginConfigListenerID = ch.AddConfigListener(func(oldCfg, newCfg *model.Config) {
		if *oldCfg.PluginSettings.Enable == *newCfg.PluginSettings.Enable {
			ch.syncPluginsActiveState()
		}
		ch.RunMultiHook(func(hooks plugin.Hooks, _ *model.Manifest) bool {
			if err := hooks.OnConfigurationChange(); err != nil {
				ch.srv.Log().Error("Plugin OnConfigurationChange hook failed", mlog.Err(err))
			}
			return true
		}, plugin.OnConfigurationChangeID)
	})
	ch.pluginsLock.Unlock()
	ch.syncPluginsActiveState()
}
func (a *App) SyncPlugins() *model.AppError {
	return a.ch.syncPlugins()
}
func (ch *Channels) syncPlugins() *model.AppError {
	ch.srv.Log().Info("Syncing plugins from the file store")
	pluginsEnvironment := ch.GetPluginsEnvironment()
	if pluginsEnvironment == nil {
		return model.NewAppError("SyncPlugins", "app.plugin.disabled.app_error", nil, "", http.StatusNotImplemented)
	}
	availablePlugins, err := pluginsEnvironment.Available()
	if err != nil {
		return model.NewAppError("SyncPlugins", "app.plugin.sync.read_local_folder.app_error", nil, "", http.StatusInternalServerError).Wrap(err)
	}
	var wg sync.WaitGroup
	for _, plugin := range availablePlugins {
		wg.Add(1)
		go func(pluginID string) {
			defer wg.Done()
			logger := ch.srv.Log().With(mlog.String("plugin_id", pluginID))
			logger.Info("Removing local installation of managed plugin before sync")
			if err := ch.removePluginLocally(pluginID); err != nil {
				logger.Error("Failed to remove local installation of managed plugin before sync", mlog.Err(err))
			}
		}(plugin.Manifest.Id)
	}
	wg.Wait()
	pluginSignaturePathMap, appErr := ch.getPluginsFromFolder()
	if appErr != nil {
		return appErr
	}
	if len(pluginSignaturePathMap) == 0 {
		ch.srv.Log().Info("No plugins to sync from the file store")
		return nil
	}
	for _, plugin := range pluginSignaturePathMap {
		wg.Add(1)
		go func(plugin *pluginSignaturePath) {
			defer wg.Done()
			logger := ch.srv.Log().With(
				mlog.String("plugin_id", plugin.pluginID),
				mlog.String("bundle_path", plugin.bundlePath),
				mlog.String("signature_path", plugin.signaturePath),
			)
			bundle, appErr := ch.srv.fileReader(plugin.bundlePath)
			if appErr != nil {
				logger.Error("Failed to open plugin bundle from file store.", mlog.Err(appErr))
				return
			}
			defer bundle.Close()
			if *ch.cfgSvc.Config().PluginSettings.RequirePluginSignature {
				signature, appErr := ch.srv.fileReader(plugin.signaturePath)
				if appErr != nil {
					logger.Error("Failed to open plugin signature from file store.", mlog.Err(appErr))
					return
				}
				defer signature.Close()
				if appErr = ch.verifyPlugin(logger, bundle, signature); appErr != nil {
					logger.Error("Failed to validate plugin signature", mlog.Err(appErr))
					return
				}
			}
			logger.Info("Syncing plugin from file store")
			if _, err := ch.installPluginLocally(bundle, installPluginLocallyAlways); err != nil && err.Id != "app.plugin.skip_installation.app_error" {
				logger.Error("Failed to sync plugin from file store", mlog.Err(err))
			}
		}(plugin)
	}
	wg.Wait()
	return nil
}
func (ch *Channels) ShutDownPlugins() {
	ch.pluginsLock.RLock()
	pluginsEnvironment := ch.pluginsEnvironment
	ch.pluginsLock.RUnlock()
	if pluginsEnvironment == nil {
		return
	}
	ch.srv.Log().Info("Shutting down plugins")
	pluginsEnvironment.Shutdown()
	ch.RemoveConfigListener(ch.pluginConfigListenerID)
	ch.pluginConfigListenerID = ""
	ch.srv.RemoveClusterLeaderChangedListener(ch.pluginClusterLeaderListenerID)
	ch.pluginClusterLeaderListenerID = ""
	ch.pluginsLock.Lock()
	defer ch.pluginsLock.Unlock()
	if ch.pluginsEnvironment == pluginsEnvironment {
		ch.pluginsEnvironment = nil
	} else {
		ch.srv.Log().Warn("Another PluginsEnvironment detected while shutting down plugins.")
	}
}
func (a *App) getPluginManifests() ([]*model.Manifest, error) {
	pluginsEnvironment := a.GetPluginsEnvironment()
	if pluginsEnvironment == nil {
		return nil, model.NewAppError("GetPluginManifests", "app.plugin.disabled.app_error", nil, "", http.StatusNotImplemented)
	}
	plugins, err := pluginsEnvironment.Available()
	if err != nil {
		return nil, errors.Wrap(err, "failed to get list of available plugins")
	}
	manifests := make([]*model.Manifest, len(plugins))
	for i := range plugins {
		manifests[i] = plugins[i].Manifest
	}
	return manifests, nil
}
func (a *App) GetActivePluginManifests() ([]*model.Manifest, *model.AppError) {
	pluginsEnvironment := a.GetPluginsEnvironment()
	if pluginsEnvironment == nil {
		return nil, model.NewAppError("GetActivePluginManifests", "app.plugin.disabled.app_error", nil, "", http.StatusNotImplemented)
	}
	plugins := pluginsEnvironment.Active()
	manifests := make([]*model.Manifest, len(plugins))
	for i, plugin := range plugins {
		manifests[i] = plugin.Manifest
	}
	return manifests, nil
}
func (a *App) EnablePlugin(id string) *model.AppError {
	return a.ch.enablePlugin(id)
}
func (ch *Channels) enablePlugin(id string) *model.AppError {
	pluginsEnvironment := ch.GetPluginsEnvironment()
	if pluginsEnvironment == nil {
		return model.NewAppError("EnablePlugin", "app.plugin.disabled.app_error", nil, "", http.StatusNotImplemented)
	}
	availablePlugins, err := pluginsEnvironment.Available()
	if err != nil {
		return model.NewAppError("EnablePlugin", "app.plugin.config.app_error", nil, "", http.StatusInternalServerError).Wrap(err)
	}
	id = strings.ToLower(id)
	var manifest *model.Manifest
	for _, p := range availablePlugins {
		if p.Manifest.Id == id {
			manifest = p.Manifest
			break
		}
	}
	if manifest == nil {
		return model.NewAppError("EnablePlugin", "app.plugin.not_installed.app_error", nil, "", http.StatusNotFound)
	}
	ch.cfgSvc.UpdateConfig(func(cfg *model.Config) {
		cfg.PluginSettings.PluginStates[id] = &model.PluginState{Enable: true}
	})
	if _, _, err := ch.cfgSvc.SaveConfig(ch.cfgSvc.Config(), true); err != nil {
		if err.Id == "ent.cluster.save_config.error" {
			return model.NewAppError("EnablePlugin", "app.plugin.cluster.save_config.app_error", nil, "", http.StatusInternalServerError)
		}
		return model.NewAppError("EnablePlugin", "app.plugin.config.app_error", nil, "", http.StatusInternalServerError).Wrap(err)
	}
	return nil
}
func (a *App) DisablePlugin(id string) *model.AppError {
	appErr := a.ch.disablePlugin(id)
	if appErr != nil {
		return appErr
	}
	return nil
}
func (ch *Channels) disablePlugin(id string) *model.AppError {
	pluginsEnvironment := ch.GetPluginsEnvironment()
	if pluginsEnvironment == nil {
		return model.NewAppError("DisablePlugin", "app.plugin.disabled.app_error", nil, "", http.StatusNotImplemented)
	}
	availablePlugins, err := pluginsEnvironment.Available()
	if err != nil {
		return model.NewAppError("DisablePlugin", "app.plugin.config.app_error", nil, "", http.StatusInternalServerError).Wrap(err)
	}
	id = strings.ToLower(id)
	var manifest *model.Manifest
	for _, p := range availablePlugins {
		if p.Manifest.Id == id {
			manifest = p.Manifest
			break
		}
	}
	if manifest == nil {
		return model.NewAppError("DisablePlugin", "app.plugin.not_installed.app_error", nil, "", http.StatusNotFound)
	}
	ch.cfgSvc.UpdateConfig(func(cfg *model.Config) {
		cfg.PluginSettings.PluginStates[id] = &model.PluginState{Enable: false}
	})
	ch.unregisterPluginCommands(id)
	if _, _, err := ch.cfgSvc.SaveConfig(ch.cfgSvc.Config(), true); err != nil {
		return model.NewAppError("DisablePlugin", "app.plugin.config.app_error", nil, "", http.StatusInternalServerError).Wrap(err)
	}
	return nil
}
func (a *App) GetPlugins() (*model.PluginsResponse, *model.AppError) {
	pluginsEnvironment := a.GetPluginsEnvironment()
	if pluginsEnvironment == nil {
		return nil, model.NewAppError("GetPlugins", "app.plugin.disabled.app_error", nil, "", http.StatusNotImplemented)
	}
	availablePlugins, err := pluginsEnvironment.Available()
	if err != nil {
		return nil, model.NewAppError("GetPlugins", "app.plugin.get_plugins.app_error", nil, "", http.StatusInternalServerError).Wrap(err)
	}
	resp := &model.PluginsResponse{Active: []*model.PluginInfo{}, Inactive: []*model.PluginInfo{}}
	for _, plugin := range availablePlugins {
		if plugin.Manifest == nil {
			continue
		}
		info := &model.PluginInfo{
			Manifest: *plugin.Manifest,
		}
		if pluginsEnvironment.IsActive(plugin.Manifest.Id) {
			resp.Active = append(resp.Active, info)
		} else {
			resp.Inactive = append(resp.Inactive, info)
		}
	}
	return resp, nil
}
func (a *App) GetMarketplacePlugins(rctx request.CTX, filter *model.MarketplacePluginFilter) ([]*model.MarketplacePlugin, *model.AppError) {
	plugins := map[string]*model.MarketplacePlugin{}
	if *a.Config().PluginSettings.EnableRemoteMarketplace && !filter.LocalOnly {
		p, appErr := a.getRemotePlugins()
		if appErr != nil {
			return nil, appErr
		}
		plugins = p
	}
	if !filter.RemoteOnly {
		appErr := a.mergePrepackagedPlugins(plugins)
		if appErr != nil {
			return nil, appErr
		}
		appErr = a.mergeLocalPlugins(rctx, plugins)
		if appErr != nil {
			return nil, appErr
		}
	}
	var result []*model.MarketplacePlugin
	for _, p := range plugins {
		if pluginMatchesFilter(p.Manifest, filter.Filter) {
			result = append(result, p)
		}
	}
	sort.SliceStable(result, func(i, j int) bool {
		return strings.ToLower(result[i].Manifest.Name) < strings.ToLower(result[j].Manifest.Name)
	})
	return result, nil
}
func (ch *Channels) getPrepackagedPlugin(pluginID, version string) (*plugin.PrepackagedPlugin, *model.AppError) {
	pluginsEnvironment := ch.GetPluginsEnvironment()
	if pluginsEnvironment == nil {
		return nil, model.NewAppError("getPrepackagedPlugin", "app.plugin.config.app_error", nil, "plugin environment is nil", http.StatusInternalServerError)
	}
	prepackagedPlugins := pluginsEnvironment.PrepackagedPlugins()
	for _, p := range prepackagedPlugins {
		if p.Manifest.Id == pluginID && (version == "" || p.Manifest.Version == version) {
			return p, nil
		}
	}
	return nil, model.NewAppError("getPrepackagedPlugin", "app.plugin.marketplace_plugins.not_found.app_error", nil, "", http.StatusInternalServerError)
}
func (ch *Channels) getRemoteMarketplacePlugin(pluginID, version string) (*model.BaseMarketplacePlugin, *model.AppError) {
	marketplaceClient, err := marketplace.NewClient(
		*ch.cfgSvc.Config().PluginSettings.MarketplaceURL,
		ch.srv.HTTPService(),
	)
	if err != nil {
		return nil, model.NewAppError("GetMarketplacePlugin", "app.plugin.marketplace_client.app_error", nil, "", http.StatusInternalServerError).Wrap(err)
	}
	filter := ch.getBaseMarketplaceFilter()
	filter.PluginId = pluginID
	var plugin *model.BaseMarketplacePlugin
	if version != "" {
		plugin, err = marketplaceClient.GetPlugin(filter, version)
	} else {
		plugin, err = marketplaceClient.GetLatestPlugin(filter)
	}
	if err != nil {
		return nil, model.NewAppError("GetMarketplacePlugin", "app.plugin.marketplace_plugins.not_found.app_error", nil, "", http.StatusInternalServerError).Wrap(err)
	}
	return plugin, nil
}
func (a *App) getRemotePlugins() (map[string]*model.MarketplacePlugin, *model.AppError) {
	result := map[string]*model.MarketplacePlugin{}
	pluginsEnvironment := a.GetPluginsEnvironment()
	if pluginsEnvironment == nil {
		return nil, model.NewAppError("getRemotePlugins", "app.plugin.config.app_error", nil, "", http.StatusInternalServerError)
	}
	marketplaceClient, err := marketplace.NewClient(
		*a.Config().PluginSettings.MarketplaceURL,
		a.HTTPService(),
	)
	if err != nil {
		return nil, model.NewAppError("getRemotePlugins", "app.plugin.marketplace_client.app_error", nil, "", http.StatusInternalServerError).Wrap(err)
	}
	filter := a.getBaseMarketplaceFilter()
	filter.PerPage = -1
	marketplacePlugins, err := marketplaceClient.GetPlugins(filter)
	if err != nil {
		return nil, model.NewAppError("getRemotePlugins", "app.plugin.marketplace_client.failed_to_fetch", nil, "", http.StatusInternalServerError).Wrap(err)
	}
	for _, p := range marketplacePlugins {
		if p.Manifest == nil {
			continue
		}
		result[p.Manifest.Id] = &model.MarketplacePlugin{BaseMarketplacePlugin: p}
	}
	return result, nil
}
func (a *App) mergePrepackagedPlugins(remoteMarketplacePlugins map[string]*model.MarketplacePlugin) *model.AppError {
	pluginsEnvironment := a.GetPluginsEnvironment()
	if pluginsEnvironment == nil {
		return model.NewAppError("mergePrepackagedPlugins", "app.plugin.config.app_error", nil, "", http.StatusInternalServerError)
	}
	for _, prepackaged := range pluginsEnvironment.PrepackagedPlugins() {
		if prepackaged.Manifest == nil {
			continue
		}
		prepackagedMarketplace := &model.MarketplacePlugin{
			BaseMarketplacePlugin: &model.BaseMarketplacePlugin{
				HomepageURL:     prepackaged.Manifest.HomepageURL,
				IconData:        prepackaged.IconData,
				ReleaseNotesURL: prepackaged.Manifest.ReleaseNotesURL,
				Manifest:        prepackaged.Manifest,
			},
		}
		if remoteMarketplacePlugins[prepackaged.Manifest.Id] == nil {
			remoteMarketplacePlugins[prepackaged.Manifest.Id] = prepackagedMarketplace
			continue
		}
		prepackagedVersion, err := semver.StrictNewVersion(prepackaged.Manifest.Version)
		if err != nil {
			return model.NewAppError("mergePrepackagedPlugins", "app.plugin.invalid_version.app_error", nil, "", http.StatusBadRequest).Wrap(err)
		}
		marketplacePlugin := remoteMarketplacePlugins[prepackaged.Manifest.Id]
		marketplaceVersion, err := semver.StrictNewVersion(marketplacePlugin.Manifest.Version)
		if err != nil {
			return model.NewAppError("mergePrepackagedPlugins", "app.plugin.invalid_version.app_error", nil, "", http.StatusBadRequest).Wrap(err)
		}
		if prepackagedVersion.GreaterThan(marketplaceVersion) {
			remoteMarketplacePlugins[prepackaged.Manifest.Id] = prepackagedMarketplace
		}
	}
	return nil
}
func (a *App) mergeLocalPlugins(rctx request.CTX, remoteMarketplacePlugins map[string]*model.MarketplacePlugin) *model.AppError {
	pluginsEnvironment := a.GetPluginsEnvironment()
	if pluginsEnvironment == nil {
		return model.NewAppError("GetMarketplacePlugins", "app.plugin.config.app_error", nil, "", http.StatusInternalServerError)
	}
	localPlugins, err := pluginsEnvironment.Available()
	if err != nil {
		return model.NewAppError("GetMarketplacePlugins", "app.plugin.config.app_error", nil, "", http.StatusInternalServerError).Wrap(err)
	}
	for _, plugin := range localPlugins {
		if plugin.Manifest == nil {
			continue
		}
		if remoteMarketplacePlugins[plugin.Manifest.Id] != nil {
			remoteMarketplacePlugins[plugin.Manifest.Id].InstalledVersion = plugin.Manifest.Version
			continue
		}
		iconData := ""
		if plugin.Manifest.IconPath != "" {
			iconData, err = getIcon(filepath.Join(plugin.Path, plugin.Manifest.IconPath))
			if err != nil {
				rctx.Logger().Warn("Error loading local plugin icon", mlog.String("plugin_id", plugin.Manifest.Id), mlog.String("icon_path", plugin.Manifest.IconPath), mlog.Err(err))
			}
		}
		var labels []model.MarketplaceLabel
		if *a.Config().PluginSettings.EnableRemoteMarketplace {
			labels = append(labels, model.MarketplaceLabel{
				Name:        "Local",
				Description: "This plugin is not listed in the marketplace",
			})
		}
		remoteMarketplacePlugins[plugin.Manifest.Id] = &model.MarketplacePlugin{
			BaseMarketplacePlugin: &model.BaseMarketplacePlugin{
				HomepageURL:     plugin.Manifest.HomepageURL,
				IconData:        iconData,
				ReleaseNotesURL: plugin.Manifest.ReleaseNotesURL,
				Labels:          labels,
				Manifest:        plugin.Manifest,
			},
			InstalledVersion: plugin.Manifest.Version,
		}
	}
	return nil
}
func (a *App) getBaseMarketplaceFilter() *model.MarketplacePluginFilter {
	return a.ch.getBaseMarketplaceFilter()
}
func (ch *Channels) getBaseMarketplaceFilter() *model.MarketplacePluginFilter {
	filter := &model.MarketplacePluginFilter{
		ServerVersion: model.CurrentVersion,
	}
	license := ch.srv.License()
	if license != nil && license.HasEnterpriseMarketplacePlugins() {
		filter.EnterprisePlugins = true
	}
	if license != nil && license.IsCloud() {
		filter.Cloud = true
	}
	if model.BuildEnterpriseReady == "true" {
		filter.BuildEnterpriseReady = true
	}
	filter.Platform = runtime.GOOS + "-" + runtime.GOARCH
	return filter
}
func pluginMatchesFilter(manifest *model.Manifest, filter string) bool {
	filter = strings.TrimSpace(strings.ToLower(filter))
	if filter == "" {
		return true
	}
	if strings.ToLower(manifest.Id) == filter {
		return true
	}
	if strings.Contains(strings.ToLower(manifest.Name), filter) {
		return true
	}
	if strings.Contains(strings.ToLower(manifest.Description), filter) {
		return true
	}
	return false
}
func (ch *Channels) notifyPluginEnabled(manifest *model.Manifest) error {
	pluginsEnvironment := ch.GetPluginsEnvironment()
	if pluginsEnvironment == nil {
		return errors.New("pluginsEnvironment is nil")
	}
	if !manifest.HasClient() || !pluginsEnvironment.IsActive(manifest.Id) {
		return nil
	}
	var statuses model.PluginStatuses
	if ch.srv.platform.Cluster() != nil {
		var err *model.AppError
		statuses, err = ch.srv.platform.Cluster().GetPluginStatuses()
		if err != nil {
			return err
		}
	}
	localStatus, err := ch.GetPluginStatus(manifest.Id)
	if err != nil {
		return err
	}
	statuses = append(statuses, localStatus)
	for _, status := range statuses {
		if status.PluginId == manifest.Id && status.Version != manifest.Version {
			ch.srv.Log().Debug("Not ready to notify webclients", mlog.String("cluster_id", status.ClusterId), mlog.String("plugin_id", manifest.Id))
			return nil
		}
	}
	message := model.NewWebSocketEvent(model.WebsocketEventPluginEnabled, "", "", "", nil, "")
	message.Add("manifest", manifest.ClientManifest())
	ch.srv.platform.Publish(message)
	return nil
}
func (ch *Channels) getPluginsFromFolder() (map[string]*pluginSignaturePath, *model.AppError) {
	fileStorePaths, appErr := ch.srv.listDirectory(fileStorePluginFolder, false)
	if appErr != nil {
		return nil, model.NewAppError("getPluginsFromDir", "app.plugin.sync.list_filestore.app_error", nil, "", http.StatusInternalServerError).Wrap(appErr)
	}
	return ch.getPluginsFromFilePaths(fileStorePaths), nil
}
func (ch *Channels) getPluginsFromFilePaths(fileStorePaths []string) map[string]*pluginSignaturePath {
	pluginSignaturePathMap := make(map[string]*pluginSignaturePath)
	for _, path := range fileStorePaths {
		if strings.HasSuffix(path, ".tar.gz") {
			id := strings.TrimSuffix(filepath.Base(path), ".tar.gz")
			helper := &pluginSignaturePath{
				pluginID:      id,
				bundlePath:    path,
				signaturePath: "",
			}
			pluginSignaturePathMap[id] = helper
		}
	}
	for _, path := range fileStorePaths {
		if strings.HasSuffix(path, ".tar.gz.sig") {
			id := strings.TrimSuffix(filepath.Base(path), ".tar.gz.sig")
			if val, ok := pluginSignaturePathMap[id]; !ok {
				ch.srv.Log().Warn("Unknown signature", mlog.String("path", path))
			} else {
				val.signaturePath = path
			}
		}
	}
	return pluginSignaturePathMap
}
func (ch *Channels) processPrepackagedPlugins(prepackagedPluginsDir string) error {
	logger := ch.srv.Log()
	logger.Info("Processing prepackaged plugin")
	prepackagedPluginsPath, found := fileutils.FindDir(prepackagedPluginsDir)
	if !found {
		logger.Debug("No prepackaged plugins directory found")
		return nil
	}
	logger = logger.With(
		mlog.String("prepackaged_plugins_path", prepackagedPluginsPath),
	)
	ch.srv.Log().Debug("Processing prepackaged plugins in directory")
	var fileStorePaths []string
	err := filepath.Walk(prepackagedPluginsPath, func(walkPath string, info os.FileInfo, err error) error {
		fileStorePaths = append(fileStorePaths, walkPath)
		return nil
	})
	if err != nil {
		return errors.Wrap(err, "failed to walk prepackaged plugins")
	}
	pluginSignaturePathMap := ch.getPluginsFromFilePaths(fileStorePaths)
	plugins := make(chan *plugin.PrepackagedPlugin, len(pluginSignaturePathMap))
	pluginsEnvironment := ch.GetPluginsEnvironment()
	if pluginsEnvironment == nil {
		return errors.New("pluginsEnvironment is nil")
	}
	availablePlugins, err := pluginsEnvironment.Available()
	if err != nil {
		return errors.Wrap(err, "failed to list available plugins")
	}
	availablePluginsMap := make(map[string]*model.BundleInfo, len(availablePlugins))
	for _, bundleInfo := range availablePlugins {
		availablePluginsMap[bundleInfo.Manifest.Id] = bundleInfo
	}
	var wg sync.WaitGroup
	for _, psPath := range pluginSignaturePathMap {
		wg.Add(1)
		go func(psPath *pluginSignaturePath) {
			defer wg.Done()
			p, err := ch.processPrepackagedPlugin(psPath)
			if err != nil {
				var appErr *model.AppError
				if errors.As(err, &appErr) && appErr.Id == "app.plugin.skip_installation.app_error" {
					return
				}
				logger.Error("Failed to install prepackaged plugin", mlog.String("bundle_path", psPath.bundlePath), mlog.Err(err))
				return
			}
			plugins <- p
		}(psPath)
	}
	wg.Wait()
	close(plugins)
	prepackagedPlugins := make([]*plugin.PrepackagedPlugin, 0, len(pluginSignaturePathMap))
	transitionallyPrepackagedPlugins := make([]*plugin.PrepackagedPlugin, 0)
	for p := range plugins {
		if ch.pluginIsTransitionallyPrepackaged(p.Manifest) {
			if ch.shouldPersistTransitionallyPrepackagedPlugin(availablePluginsMap, p) {
				transitionallyPrepackagedPlugins = append(transitionallyPrepackagedPlugins, p)
			}
		} else {
			prepackagedPlugins = append(prepackagedPlugins, p)
		}
	}
	pluginsEnvironment.SetPrepackagedPlugins(prepackagedPlugins, transitionallyPrepackagedPlugins)
	return nil
}
func (ch *Channels) processPrepackagedPlugin(pluginPath *pluginSignaturePath) (*plugin.PrepackagedPlugin, error) {
	logger := ch.srv.Log().With(
		mlog.String("bundle_path", pluginPath.bundlePath),
		mlog.String("signature_path", pluginPath.signaturePath),
	)
	logger.Info("Processing prepackaged plugin")
	fileReader, err := os.Open(pluginPath.bundlePath)
	if err != nil {
		return nil, errors.Wrapf(err, "Failed to open prepackaged plugin %s", pluginPath.bundlePath)
	}
	defer fileReader.Close()
	tmpDir, err := os.MkdirTemp("", "plugintmp")
	if err != nil {
		return nil, errors.Wrap(err, "Failed to create temp dir plugintmp")
	}
	defer os.RemoveAll(tmpDir)
	plugin, pluginDir, err := ch.buildPrepackagedPlugin(logger, pluginPath, fileReader, tmpDir)
	if err != nil {
		return nil, errors.Wrapf(err, "Failed to get prepackaged plugin %s", pluginPath.bundlePath)
	}
	logger = logger.With(mlog.String("plugin_id", plugin.Manifest.Id))
	if !*ch.cfgSvc.Config().PluginSettings.AutomaticPrepackagedPlugins {
		logger.Info("Not installing prepackaged plugin: automatic prepackaged plugins disabled")
		return plugin, nil
	}
	pluginState := ch.cfgSvc.Config().PluginSettings.PluginStates[plugin.Manifest.Id]
	if pluginState == nil || !pluginState.Enable {
		logger.Info("Not installing prepackaged plugin: not previously enabled")
		return plugin, nil
	}
	if _, err := ch.installExtractedPlugin(plugin.Manifest, pluginDir, installPluginLocallyOnlyIfNewOrUpgrade); err != nil && err.Id != "app.plugin.skip_installation.app_error" {
		return nil, errors.Wrapf(err, "Failed to install extracted prepackaged plugin %s", pluginPath.bundlePath)
	}
	return plugin, nil
}
var transitionallyPrepackagedPlugins = []string{
	"antivirus",
	"focalboard",
	"mattermost-autolink",
	"com.mattermost.aws-sns",
	"com.mattermost.confluence",
	"com.mattermost.custom-attributes",
	"jenkins",
	"jitsi",
	"com.mattermost.plugin-todo",
	"com.mattermost.welcomebot",
	"com.mattermost.apps",
}
func (ch *Channels) pluginIsTransitionallyPrepackaged(m *model.Manifest) bool {
	return slices.Contains(transitionallyPrepackagedPlugins, m.Id)
}
func (ch *Channels) shouldPersistTransitionallyPrepackagedPlugin(availablePluginsMap map[string]*model.BundleInfo, p *plugin.PrepackagedPlugin) bool {
	logger := ch.srv.Log().With(mlog.String("plugin_id", p.Manifest.Id), mlog.String("prepackaged_version", p.Manifest.Version))
	pluginState := ch.cfgSvc.Config().PluginSettings.PluginStates[p.Manifest.Id]
	if pluginState == nil || !pluginState.Enable {
		logger.Debug("Should not persist transitionally prepackaged plugin: not previously enabled")
		return false
	}
	existing, found := availablePluginsMap[p.Manifest.Id]
	if !found {
		logger.Info("Should persist transitionally prepackaged plugin: not currently in filestore")
		return true
	}
	prepackagedVersion, err := semver.StrictNewVersion(p.Manifest.Version)
	if err != nil {
		logger.Error("Should not persist transitionally prepackged plugin: invalid prepackaged version", mlog.Err(err))
		return false
	}
	logger = logger.With(mlog.String("existing_version", existing.Manifest.Version))
	existingVersion, err := semver.StrictNewVersion(existing.Manifest.Version)
	if err != nil {
		logger.Warn("Should persist transitionally prepackged plugin: invalid existing version", mlog.Err(err))
		return true
	}
	if prepackagedVersion.GreaterThan(existingVersion) {
		logger.Info("Should persist transitionally prepackged plugin: newer version")
		return true
	}
	logger.Info("Should not persist transitionally prepackged plugin: not a newer version")
	return false
}
func (ch *Channels) persistTransitionallyPrepackagedPlugins() {
	if !ch.srv.IsLeader() {
		ch.srv.Log().Debug("Not persisting transitionally prepackaged plugins: not the leader")
		return
	}
	pluginsEnvironment := ch.GetPluginsEnvironment()
	if pluginsEnvironment == nil {
		ch.srv.Log().Debug("Not persisting transitionally prepackaged plugins: no plugin environment")
		return
	}
	transitionallyPrepackagedPlugins := pluginsEnvironment.TransitionallyPrepackagedPlugins()
	if len(transitionallyPrepackagedPlugins) == 0 {
		ch.srv.Log().Debug("Not persisting transitionally prepackaged plugins: none found")
		return
	}
	var wg sync.WaitGroup
	for _, p := range transitionallyPrepackagedPlugins {
		wg.Add(1)
		go func(p *plugin.PrepackagedPlugin) {
			defer wg.Done()
			logger := ch.srv.Log().With(
				mlog.String("plugin_id", p.Manifest.Id),
				mlog.String("version", p.Manifest.Version),
				mlog.String("bundle_path", p.Path),
				mlog.String("signature_path", p.SignaturePath),
			)
			logger.Info("Persisting transitionally prepackaged plugin")
			bundleReader, err := os.Open(p.Path)
			if err != nil {
				logger.Error("Failed to read transitionally prepackaged plugin", mlog.Err(err))
				return
			}
			defer bundleReader.Close()
			signatureReader, err := os.Open(p.SignaturePath)
			if err != nil {
				logger.Error("Failed to read transitionally prepackaged plugin signature", mlog.Err(err))
				return
			}
			defer signatureReader.Close()
			appErr := ch.installPluginToFilestore(p.Manifest, bundleReader, signatureReader)
			if appErr != nil {
				logger.Error("Failed to persist transitionally prepackaged plugin", mlog.Err(appErr))
			}
		}(p)
	}
	wg.Wait()
	pluginsEnvironment.ClearTransitionallyPrepackagedPlugins()
	ch.srv.Log().Info("Finished persisting transitionally prepackaged plugins")
}
func (ch *Channels) buildPrepackagedPlugin(logger *mlog.Logger, pluginPath *pluginSignaturePath, pluginFile io.ReadSeeker, tmpDir string) (*plugin.PrepackagedPlugin, string, error) {
	if pluginPath.signaturePath == "" {
		return nil, "", errors.Errorf("Prepackaged plugin missing required signature file")
	}
	signatureFile, sigErr := os.Open(pluginPath.signaturePath)
	if sigErr != nil {
		return nil, "", errors.Wrapf(sigErr, "Failed to open prepackaged plugin signature %s", pluginPath.signaturePath)
	}
	defer signatureFile.Close()
	if _, err := pluginFile.Seek(0, io.SeekStart); err != nil {
		return nil, "", errors.Wrapf(err, "Failed to seek to start of plugin file for signature verification: %s", pluginPath.bundlePath)
	}
	if appErr := ch.verifyPlugin(logger, pluginFile, signatureFile); appErr != nil {
		return nil, "", errors.Wrapf(appErr, "Prepackaged plugin signature verification failed for %s using %s", pluginPath.bundlePath, pluginPath.signaturePath)
	}
	if _, err := pluginFile.Seek(0, io.SeekStart); err != nil {
		return nil, "", errors.Wrapf(err, "Failed to seek to start of plugin file for extraction: %s", pluginPath.bundlePath)
	}
	manifest, pluginDir, appErr := extractPlugin(pluginFile, tmpDir)
	if appErr != nil {
		return nil, "", errors.Wrapf(appErr, "Failed to extract plugin with path %s", pluginPath.bundlePath)
	}
	plugin := new(plugin.PrepackagedPlugin)
	plugin.Manifest = manifest
	plugin.Path = pluginPath.bundlePath
	plugin.SignaturePath = pluginPath.signaturePath
	if manifest.IconPath != "" {
		iconData, err := getIcon(filepath.Join(pluginDir, manifest.IconPath))
		if err != nil {
			logger.Warn("Error loading local plugin icon", mlog.String("icon_path", plugin.Manifest.IconPath), mlog.Err(err))
		}
		plugin.IconData = iconData
	}
	return plugin, pluginDir, nil
}
func getIcon(iconPath string) (string, error) {
	icon, err := os.ReadFile(iconPath)
	if err != nil {
		return "", errors.Wrapf(err, "failed to open icon at path %s", iconPath)
	}
	if !svg.Is(icon) {
		return "", errors.Errorf("icon is not svg %s", iconPath)
	}
	return fmt.Sprintf("data:image/svg+xml;base64,%s", base64.StdEncoding.EncodeToString(icon)), nil
}
func (ch *Channels) getPluginStateOverride(pluginID string) (bool, bool) {
	switch pluginID {
	case model.PluginIdApps:
		if !ch.cfgSvc.Config().FeatureFlags.AppsEnabled {
			return true, false
		}
	}
	return false, false
}
func (a *App) IsPluginActive(pluginName string) (bool, error) {
	return a.Channels().IsPluginActive(pluginName)
}
func (ch *Channels) IsPluginActive(pluginName string) (bool, error) {
	pluginStatus, err := ch.GetPluginStatus(pluginName)
	if err != nil {
		return false, err
	}
	return pluginStatus.State == model.PluginStateRunning, nil
}