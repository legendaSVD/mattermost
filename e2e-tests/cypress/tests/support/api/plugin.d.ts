interface PluginStatus {
    isInstalled: boolean;
    isActive: boolean;
}
interface PluginTestInfo {
    id: string;
    version: string;
    url: string;
    filename: string;
}
declare namespace Cypress {
    interface Chainable {
        apiGetAllPlugins(): Chainable<PluginsResponse>;
        apiGetPluginStatus(pluginId: string, version?: string): Chainable<PluginStatus>;
        apiUploadPlugin(filename: string): Chainable<Response>;
        apiUploadAndEnablePlugin(pluginTestInfo: PluginTestInfo): Chainable<Response>;
        apiInstallPluginFromUrl(pluginDownloadUrl: string, force: string): Chainable<PluginManifest>;
        apiEnablePluginById(pluginId: string): Chainable<Record<string, any>>;
        apiDisablePluginById(pluginId: string): Chainable<Record<string, any>>;
        apiDisableNonPrepackagedPlugins(): Chainable<Record<string, any>>;
        apiRemovePluginById(pluginId: string, force: string): Chainable<Record<string, any>>;
        apiUninstallAllPlugins(): Chainable;
    }
}