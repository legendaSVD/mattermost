package app
import (
	"bytes"
	"fmt"
	"io"
	"net/http"
	"os"
	"path/filepath"
	"github.com/Masterminds/semver/v3"
	"github.com/mattermost/mattermost/server/public/model"
	"github.com/mattermost/mattermost/server/public/shared/mlog"
	"github.com/mattermost/mattermost/server/public/utils"
	"github.com/mattermost/mattermost/server/v8/platform/shared/filestore"
)
const fileStorePluginFolder = "plugins"
func (ch *Channels) installPluginFromClusterMessage(pluginID string) {
	logger := ch.srv.Log().With(mlog.String("plugin_id", pluginID))
	logger.Info("Installing plugin as per cluster message")
	pluginSignaturePathMap, appErr := ch.getPluginsFromFolder()
	if appErr != nil {
		logger.Error("Failed to get plugin signatures from filestore.", mlog.Err(appErr))
		return
	}
	plugin, ok := pluginSignaturePathMap[pluginID]
	if !ok {
		logger.Error("Failed to get plugin signature from filestore.")
		return
	}
	logger = logger.With(
		mlog.String("bundle_path", plugin.bundlePath),
		mlog.String("signature_path", plugin.signaturePath),
	)
	bundle, appErr := ch.srv.fileReader(plugin.bundlePath)
	if appErr != nil {
		logger.Error("Failed to open plugin bundle from file store.", mlog.Err(appErr))
		return
	}
	defer bundle.Close()
	var signature filestore.ReadCloseSeeker
	if *ch.cfgSvc.Config().PluginSettings.RequirePluginSignature {
		signature, appErr = ch.srv.fileReader(plugin.signaturePath)
		if appErr != nil {
			logger.Error("Failed to open plugin signature from file store.", mlog.Err(appErr))
			return
		}
		defer signature.Close()
		if err := ch.verifyPlugin(logger, bundle, signature); err != nil {
			logger.Error("Failed to validate plugin signature.", mlog.Err(appErr))
			return
		}
	}
	manifest, appErr := ch.installPluginLocally(bundle, installPluginLocallyAlways)
	if appErr != nil {
		if appErr.Id != "app.plugin.blocked.app_error" && appErr.Id != "app.plugin.skip_installation.app_error" {
			logger.Error("Failed to sync plugin from file store", mlog.Err(appErr))
		}
		return
	}
	if err := ch.notifyPluginEnabled(manifest); err != nil {
		logger.Error("Failed notify plugin enabled", mlog.Err(err))
	}
	if err := ch.notifyPluginStatusesChanged(); err != nil {
		logger.Error("Failed to notify plugin status changed", mlog.Err(err))
	}
}
func (ch *Channels) removePluginFromClusterMessage(pluginID string) {
	logger := ch.srv.Log().With(mlog.String("plugin_id", pluginID))
	logger.Info("Removing plugin as per cluster message")
	if err := ch.removePluginLocally(pluginID); err != nil {
		logger.Error("Failed to remove plugin locally", mlog.Err(err))
	}
	if err := ch.notifyPluginStatusesChanged(); err != nil {
		logger.Error("failed to notify plugin status changed", mlog.Err(err))
	}
}
func (a *App) InstallPlugin(pluginFile io.ReadSeeker, replace bool) (*model.Manifest, *model.AppError) {
	installationStrategy := installPluginLocallyOnlyIfNew
	if replace {
		installationStrategy = installPluginLocallyAlways
	}
	return a.ch.installPlugin(pluginFile, nil, installationStrategy)
}
func (ch *Channels) installPlugin(bundle, signature io.ReadSeeker, installationStrategy pluginInstallationStrategy) (*model.Manifest, *model.AppError) {
	manifest, appErr := ch.installPluginLocally(bundle, installationStrategy)
	if appErr != nil {
		return nil, appErr
	}
	if manifest == nil {
		return nil, nil
	}
	logger := ch.srv.Log().With(mlog.String("plugin_id", manifest.Id))
	appErr = ch.installPluginToFilestore(manifest, bundle, signature)
	if appErr != nil {
		return nil, appErr
	}
	if err := ch.notifyPluginEnabled(manifest); err != nil {
		logger.Warn("Failed to notify plugin enabled", mlog.Err(err))
	}
	if err := ch.notifyPluginStatusesChanged(); err != nil {
		logger.Warn("Failed to notify plugin status changed", mlog.Err(err))
	}
	return manifest, nil
}
func (ch *Channels) installPluginToFilestore(manifest *model.Manifest, bundle, signature io.ReadSeeker) *model.AppError {
	logger := ch.srv.Log().With(mlog.String("plugin_id", manifest.Id))
	logger.Info("Persisting plugin to filestore")
	if signature == nil {
		logger.Warn("No signature when persisting plugin to filestore")
	} else {
		signatureStorePath := getSignatureStorePath(manifest.Id)
		_, err := signature.Seek(0, 0)
		if err != nil {
			return model.NewAppError("saveSignature", "app.plugin.store_signature.app_error", nil, "", http.StatusInternalServerError).Wrap(err)
		}
		logger.Debug("Persisting plugin signature to filestore", mlog.String("path", signatureStorePath))
		if _, appErr := ch.srv.writeFile(signature, signatureStorePath); appErr != nil {
			return model.NewAppError("saveSignature", "app.plugin.store_signature.app_error", nil, "", http.StatusInternalServerError).Wrap(appErr)
		}
	}
	bundleStorePath := getBundleStorePath(manifest.Id)
	_, err := bundle.Seek(0, 0)
	if err != nil {
		return model.NewAppError("uploadPlugin", "app.plugin.store_bundle.app_error", nil, "", http.StatusInternalServerError).Wrap(err)
	}
	logger.Debug("Persisting plugin bundle to filestore", mlog.String("path", bundleStorePath))
	if _, appErr := ch.srv.writeFile(bundle, bundleStorePath); appErr != nil {
		return model.NewAppError("uploadPlugin", "app.plugin.store_bundle.app_error", nil, "", http.StatusInternalServerError).Wrap(appErr)
	}
	ch.notifyClusterPluginEvent(
		model.ClusterEventInstallPlugin,
		model.PluginEventData{
			Id: manifest.Id,
		},
	)
	return nil
}
func (ch *Channels) InstallMarketplacePlugin(request *model.InstallMarketplacePluginRequest) (*model.Manifest, *model.AppError) {
	logger := ch.srv.Log().With(
		mlog.String("plugin_id", request.Id),
		mlog.String("requested_version", request.Version),
	)
	logger.Info("Installing plugin from marketplace")
	var pluginFile, signatureFile io.ReadSeeker
	prepackagedPlugin, appErr := ch.getPrepackagedPlugin(request.Id, request.Version)
	if appErr != nil && appErr.Id != "app.plugin.marketplace_plugins.not_found.app_error" {
		return nil, appErr
	}
	if prepackagedPlugin != nil {
		fileReader, err := os.Open(prepackagedPlugin.Path)
		if err != nil {
			return nil, model.NewAppError("InstallMarketplacePlugin", "app.plugin.install_marketplace_plugin.app_error", nil, fmt.Sprintf("failed to open prepackaged plugin %s", prepackagedPlugin.Path), http.StatusInternalServerError).Wrap(err)
		}
		defer fileReader.Close()
		signatureReader, err := os.Open(prepackagedPlugin.SignaturePath)
		if err != nil {
			return nil, model.NewAppError("InstallMarketplacePlugin", "app.plugin.install_marketplace_plugin.app_error", nil, fmt.Sprintf("failed to open prepackaged plugin signature %s", prepackagedPlugin.SignaturePath), http.StatusInternalServerError).Wrap(err)
		}
		defer signatureReader.Close()
		pluginFile = fileReader
		signatureFile = signatureReader
		logger.Debug("Found matching pre-packaged plugin", mlog.String("bundle_path", prepackagedPlugin.Path), mlog.String("signature_path", prepackagedPlugin.SignaturePath))
	}
	if *ch.cfgSvc.Config().PluginSettings.EnableRemoteMarketplace {
		var plugin *model.BaseMarketplacePlugin
		plugin, appErr = ch.getRemoteMarketplacePlugin(request.Id, request.Version)
		if appErr != nil && appErr.Id != "app.plugin.marketplace_plugins.not_found.app_error" {
			logger.Warn("Failed to reach Marketplace to install plugin", mlog.Err(appErr))
		}
		if plugin != nil {
			prepackagedVersion, _ := semver.StrictNewVersion("0.0.0")
			if prepackagedPlugin != nil {
				var err error
				prepackagedVersion, err = semver.StrictNewVersion(prepackagedPlugin.Manifest.Version)
				if err != nil {
					return nil, model.NewAppError("InstallMarketplacePlugin", "app.plugin.invalid_version.app_error", nil, "", http.StatusBadRequest).Wrap(err)
				}
			}
			marketplaceVersion, err := semver.StrictNewVersion(plugin.Manifest.Version)
			if err != nil {
				return nil, model.NewAppError("InstallMarketplacePlugin", "app.prepackged-plugin.invalid_version.app_error", nil, "", http.StatusBadRequest).Wrap(err)
			}
			if prepackagedVersion.LessThan(marketplaceVersion) {
				logger.Debug("Found upgraded plugin from remote marketplace", mlog.String("version", plugin.Manifest.Version), mlog.String("download_url", plugin.DownloadURL))
				downloadedPluginBytes, err := ch.srv.downloadFromURL(plugin.DownloadURL)
				if err != nil {
					return nil, model.NewAppError("InstallMarketplacePlugin", "app.plugin.install_marketplace_plugin.app_error", nil, "", http.StatusInternalServerError).Wrap(err)
				}
				signature, err := plugin.DecodeSignature()
				if err != nil {
					return nil, model.NewAppError("InstallMarketplacePlugin", "app.plugin.signature_decode.app_error", nil, "", http.StatusNotImplemented).Wrap(err)
				}
				pluginFile = bytes.NewReader(downloadedPluginBytes)
				signatureFile = signature
			} else {
				logger.Debug("Preferring pre-packaged plugin over version in remote marketplace", mlog.String("version", plugin.Manifest.Version), mlog.String("download_url", plugin.DownloadURL))
			}
		}
	}
	if pluginFile == nil {
		return nil, model.NewAppError("InstallMarketplacePlugin", "app.plugin.marketplace_plugins.not_found.app_error", nil, "", http.StatusInternalServerError)
	}
	if signatureFile == nil {
		return nil, model.NewAppError("InstallMarketplacePlugin", "app.plugin.marketplace_plugins.signature_not_found.app_error", nil, "", http.StatusInternalServerError)
	}
	appErr = ch.verifyPlugin(logger, pluginFile, signatureFile)
	if appErr != nil {
		return nil, appErr
	}
	manifest, appErr := ch.installPlugin(pluginFile, signatureFile, installPluginLocallyAlways)
	if appErr != nil {
		return nil, appErr
	}
	return manifest, nil
}
type pluginInstallationStrategy int
const (
	installPluginLocallyOnlyIfNew pluginInstallationStrategy = iota
	installPluginLocallyOnlyIfNewOrUpgrade
	installPluginLocallyAlways
)
func (ch *Channels) installPluginLocally(bundle io.ReadSeeker, installationStrategy pluginInstallationStrategy) (*model.Manifest, *model.AppError) {
	pluginsEnvironment := ch.GetPluginsEnvironment()
	if pluginsEnvironment == nil {
		return nil, model.NewAppError("installPluginLocally", "app.plugin.disabled.app_error", nil, "", http.StatusNotImplemented)
	}
	tmpDir, err := os.MkdirTemp("", "plugintmp")
	if err != nil {
		return nil, model.NewAppError("installPluginLocally", "app.plugin.filesystem.app_error", nil, "", http.StatusInternalServerError).Wrap(err)
	}
	defer os.RemoveAll(tmpDir)
	manifest, pluginDir, appErr := extractPlugin(bundle, tmpDir)
	if appErr != nil {
		return nil, appErr
	}
	manifest, appErr = ch.installExtractedPlugin(manifest, pluginDir, installationStrategy)
	if appErr != nil {
		return nil, appErr
	}
	return manifest, nil
}
func extractPlugin(bundle io.ReadSeeker, extractDir string) (*model.Manifest, string, *model.AppError) {
	if _, err := bundle.Seek(0, 0); err != nil {
		return nil, "", model.NewAppError("extractPlugin", "app.plugin.seek.app_error", nil, "", http.StatusInternalServerError).Wrap(err)
	}
	if err := extractTarGz(bundle, extractDir); err != nil {
		return nil, "", model.NewAppError("extractPlugin", "app.plugin.extract.app_error", nil, "", http.StatusBadRequest).Wrap(err)
	}
	dir, err := os.ReadDir(extractDir)
	if err != nil {
		return nil, "", model.NewAppError("extractPlugin", "app.plugin.filesystem.app_error", nil, "", http.StatusInternalServerError).Wrap(err)
	}
	if len(dir) == 1 && dir[0].IsDir() {
		extractDir = filepath.Join(extractDir, dir[0].Name())
	}
	manifest, _, err := model.FindManifest(extractDir)
	if err != nil {
		return nil, "", model.NewAppError("extractPlugin", "app.plugin.manifest.app_error", nil, "", http.StatusBadRequest).Wrap(err)
	}
	if !model.IsValidPluginId(manifest.Id) {
		return nil, "", model.NewAppError("extractPlugin", "app.plugin.invalid_id.app_error", map[string]any{"Min": model.MinIdLength, "Max": model.MaxIdLength, "Regex": model.ValidIdRegex}, "", http.StatusBadRequest)
	}
	return manifest, extractDir, nil
}
func (ch *Channels) installExtractedPlugin(manifest *model.Manifest, fromPluginDir string, installationStrategy pluginInstallationStrategy) (*model.Manifest, *model.AppError) {
	logger := ch.srv.Log().With(mlog.String("plugin_id", manifest.Id))
	logger.Info("Installing extracted plugin", mlog.String("version", manifest.Version))
	pluginsEnvironment := ch.GetPluginsEnvironment()
	if pluginsEnvironment == nil {
		return nil, model.NewAppError("installExtractedPlugin", "app.plugin.disabled.app_error", nil, "", http.StatusNotImplemented)
	}
	bundles, err := pluginsEnvironment.Available()
	if err != nil {
		return nil, model.NewAppError("installExtractedPlugin", "app.plugin.install.app_error", nil, "", http.StatusInternalServerError).Wrap(err)
	}
	var existingManifest *model.Manifest
	for _, bundle := range bundles {
		if bundle.Manifest != nil && bundle.Manifest.Id == manifest.Id {
			existingManifest = bundle.Manifest
			break
		}
	}
	if existingManifest != nil {
		if installationStrategy == installPluginLocallyOnlyIfNew {
			return nil, model.NewAppError("installExtractedPlugin", "app.plugin.install_id.app_error", nil, "", http.StatusBadRequest)
		}
		if installationStrategy == installPluginLocallyOnlyIfNewOrUpgrade {
			version, vErr := semver.StrictNewVersion(manifest.Version)
			if vErr != nil {
				return nil, model.NewAppError("installExtractedPlugin", "app.plugin.invalid_version.app_error", nil, "", http.StatusBadRequest).Wrap(vErr)
			}
			existingVersion, vErr := semver.StrictNewVersion(existingManifest.Version)
			if vErr != nil {
				return nil, model.NewAppError("installExtractedPlugin", "app.plugin.invalid_version.app_error", nil, "", http.StatusInternalServerError).Wrap(vErr)
			}
			if version.LessThanEqual(existingVersion) {
				logger.Warn("Skipping local installation of plugin since not a newer version", mlog.String("version", version.String()), mlog.String("existing_version", existingVersion.String()))
				return nil, model.NewAppError("installExtractedPlugin", "app.plugin.skip_installation.app_error", map[string]any{"Id": manifest.Id}, "", http.StatusInternalServerError)
			}
		}
		logger.Info("Removing existing installation of plugin before local install", mlog.String("existing_version", existingManifest.Version))
		if err := ch.removePluginLocally(existingManifest.Id); err != nil {
			return nil, model.NewAppError("installExtractedPlugin", "app.plugin.install_id_failed_remove.app_error", nil, "", http.StatusInternalServerError).Wrap(err)
		}
	}
	bundlePath := filepath.Join(*ch.cfgSvc.Config().PluginSettings.Directory, manifest.Id)
	err = utils.CopyDir(fromPluginDir, bundlePath)
	if err != nil {
		return nil, model.NewAppError("installExtractedPlugin", "app.plugin.mvdir.app_error", nil, "", http.StatusInternalServerError).Wrap(err)
	}
	if manifest.HasWebapp() {
		updatedManifest, err := pluginsEnvironment.UnpackWebappBundle(manifest.Id)
		if err != nil {
			return nil, model.NewAppError("installExtractedPlugin", "app.plugin.webapp_bundle.app_error", nil, "", http.StatusInternalServerError).Wrap(err)
		}
		manifest = updatedManifest
	}
	pluginState := ch.cfgSvc.Config().PluginSettings.PluginStates[manifest.Id]
	if pluginState != nil && pluginState.Enable {
		if hasOverride, enabled := ch.getPluginStateOverride(manifest.Id); hasOverride && !enabled {
			return manifest, nil
		}
		updatedManifest, _, err := pluginsEnvironment.Activate(manifest.Id)
		if err != nil {
			return nil, model.NewAppError("installExtractedPlugin", "app.plugin.restart.app_error", nil, "", http.StatusInternalServerError).Wrap(err)
		} else if updatedManifest == nil {
			return nil, model.NewAppError("installExtractedPlugin", "app.plugin.restart.app_error", nil, "failed to activate plugin: plugin already active", http.StatusInternalServerError)
		}
		manifest = updatedManifest
	}
	return manifest, nil
}
func (ch *Channels) RemovePlugin(id string) *model.AppError {
	logger := ch.srv.Log().With(mlog.String("plugin_id", id))
	if err := ch.disablePlugin(id); err != nil {
		return err
	}
	if err := ch.removePluginLocally(id); err != nil {
		return err
	}
	bundlePath := getBundleStorePath(id)
	bundleExists, err := ch.srv.fileExists(bundlePath)
	if err != nil {
		return model.NewAppError("removePlugin", "app.plugin.remove_bundle.app_error", nil, "", http.StatusInternalServerError).Wrap(err)
	}
	if !bundleExists {
		return nil
	}
	if err := ch.srv.removeFile(bundlePath); err != nil {
		return model.NewAppError("removePlugin", "app.plugin.remove_bundle.app_error", nil, "", http.StatusInternalServerError).Wrap(err)
	}
	if err := ch.removeSignature(id); err != nil {
		logger.Warn("Can't remove signature", mlog.Err(err))
	}
	ch.notifyClusterPluginEvent(
		model.ClusterEventRemovePlugin,
		model.PluginEventData{
			Id: id,
		},
	)
	if err := ch.notifyPluginStatusesChanged(); err != nil {
		logger.Warn("Failed to notify plugin status changed", mlog.Err(err))
	}
	return nil
}
func (ch *Channels) removePluginLocally(id string) *model.AppError {
	pluginsEnvironment := ch.GetPluginsEnvironment()
	if pluginsEnvironment == nil {
		return model.NewAppError("removePlugin", "app.plugin.disabled.app_error", nil, "", http.StatusNotImplemented)
	}
	plugins, err := pluginsEnvironment.Available()
	if err != nil {
		return model.NewAppError("removePlugin", "app.plugin.deactivate.app_error", nil, "", http.StatusBadRequest).Wrap(err)
	}
	var manifest *model.Manifest
	var unpackedBundlePath string
	for _, p := range plugins {
		if p.Manifest != nil && p.Manifest.Id == id {
			manifest = p.Manifest
			unpackedBundlePath = filepath.Dir(p.ManifestPath)
			break
		}
	}
	if manifest == nil {
		return model.NewAppError("removePlugin", "app.plugin.not_installed.app_error", nil, "", http.StatusNotFound)
	}
	pluginsEnvironment.Deactivate(id)
	pluginsEnvironment.RemovePlugin(id)
	ch.unregisterPluginCommands(id)
	if err := os.RemoveAll(unpackedBundlePath); err != nil {
		return model.NewAppError("removePlugin", "app.plugin.remove.app_error", nil, "", http.StatusInternalServerError).Wrap(err)
	}
	return nil
}
func (ch *Channels) removeSignature(pluginID string) *model.AppError {
	logger := ch.srv.Log().With(mlog.String("plugin_id", pluginID))
	signaturePath := getSignatureStorePath(pluginID)
	exists, err := ch.srv.fileExists(signaturePath)
	if err != nil {
		return model.NewAppError("removeSignature", "app.plugin.remove_bundle.app_error", nil, "", http.StatusInternalServerError).Wrap(err)
	}
	if !exists {
		logger.Debug("no plugin signature to remove")
		return nil
	}
	if err = ch.srv.removeFile(signaturePath); err != nil {
		return model.NewAppError("removeSignature", "app.plugin.remove_bundle.app_error", nil, "", http.StatusInternalServerError).Wrap(err)
	}
	return nil
}
func getBundleStorePath(id string) string {
	return filepath.Join(fileStorePluginFolder, fmt.Sprintf("%s.tar.gz", id))
}
func getSignatureStorePath(id string) string {
	return filepath.Join(fileStorePluginFolder, fmt.Sprintf("%s.tar.gz.sig", id))
}