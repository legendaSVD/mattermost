import {Client4} from '@mattermost/client';
import {PluginManifest} from '@mattermost/types/plugins';
export async function isPluginActive(client: Client4, pluginId: string): Promise<boolean> {
    const plugins = await client.getPlugins();
    return plugins.active.some((plugin: PluginManifest) => plugin.id === pluginId);
}
export async function getPluginStatus(
    client: Client4,
    pluginId: string,
): Promise<{isInstalled: boolean; isActive: boolean}> {
    const plugins = await client.getPlugins();
    const isActive = plugins.active.some((plugin: PluginManifest) => plugin.id === pluginId);
    const isInactive = plugins.inactive.some((plugin: PluginManifest) => plugin.id === pluginId);
    return {
        isInstalled: isActive || isInactive,
        isActive,
    };
}
export async function installAndEnablePlugin(
    client: Client4,
    pluginUrl: string,
    pluginId: string,
    force = true,
): Promise<void> {
    const status = await getPluginStatus(client, pluginId);
    if (status.isActive) {
        return;
    }
    if (status.isInstalled) {
        await client.enablePlugin(pluginId);
        return;
    }
    await client.installPluginFromUrl(pluginUrl, force);
    await client.enablePlugin(pluginId);
}