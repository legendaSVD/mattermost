import regeneratorRuntime from 'regenerator-runtime';
import type {PluginManifest, ClientPluginManifest} from '@mattermost/types/plugins';
import {Client4} from 'mattermost-redux/client';
import {Preferences} from 'mattermost-redux/constants';
import {getConfig, isPerformanceDebuggingEnabled} from 'mattermost-redux/selectors/entities/general';
import {getBool} from 'mattermost-redux/selectors/entities/preferences';
import {unregisterAdminConsolePlugin} from 'actions/admin_actions';
import {unregisterPluginTranslationsSource} from 'actions/views/root';
import {unregisterAllPluginWebSocketEvents, unregisterPluginReconnectHandler} from 'actions/websocket_actions';
import store from 'stores/redux_store';
import PluginRegistry from 'plugins/registry';
import {ActionTypes} from 'utils/constants';
import {getSiteURL} from 'utils/url';
import type {GlobalState, ActionFuncAsync} from 'types/store';
import {removeWebappPlugin} from './actions';
import 'components/widgets/modals/full_screen_modal.scss';
interface Plugin {
    initialize?: (registry: PluginRegistry, store: any) => void;
    uninitialize?: () => void;
    deinitialize?: () => void;
}
interface WindowWithPlugins extends Window {
    plugins: {
        [key: string]: Plugin;
    };
    registerPlugin: (id: string, plugin: Plugin) => void;
    regeneratorRuntime: typeof regeneratorRuntime;
}
declare let window: WindowWithPlugins;
window.regeneratorRuntime = regeneratorRuntime;
window.plugins = {};
function registerPlugin(id: string, plugin: Plugin): void {
    const oldPlugin = window.plugins[id];
    if (oldPlugin && oldPlugin.uninitialize) {
        oldPlugin.uninitialize();
    }
    window.plugins[id] = plugin;
    onPluginRegistered(id);
}
window.registerPlugin = registerPlugin;
function arePluginsEnabled(state: GlobalState): boolean {
    if (getConfig(state).PluginsEnabled !== 'true') {
        return false;
    }
    if (
        isPerformanceDebuggingEnabled(state) &&
        getBool(state, Preferences.CATEGORY_PERFORMANCE_DEBUGGING, Preferences.NAME_DISABLE_CLIENT_PLUGINS)
    ) {
        return false;
    }
    return true;
}
export async function initializePlugins(): Promise<void> {
    if (!arePluginsEnabled(store.getState())) {
        return;
    }
    const {data, error} = await store.dispatch(getPlugins());
    if (error) {
        console.error(error);
        return;
    }
    if (data == null || data.length === 0) {
        return;
    }
    await Promise.all(data.map(async (m: ClientPluginManifest) => {
        return loadPlugin(m as PluginManifest).catch((loadErr: Error) => {
            console.error(loadErr.message);
        });
    }));
}
export function getPlugins(): ActionFuncAsync<ClientPluginManifest[]> {
    return async (dispatch) => {
        let plugins;
        try {
            plugins = await Client4.getWebappPlugins();
        } catch (error) {
            return {error};
        }
        dispatch({type: ActionTypes.RECEIVED_WEBAPP_PLUGINS, data: plugins});
        return {data: plugins};
    };
}
const loadedPlugins: { [key: string]: PluginManifest } = {};
const describePlugin = (manifest: PluginManifest): string => (
    'plugin ' + manifest.id + ', version ' + manifest.version
);
export function loadPlugin(manifest: PluginManifest): Promise<void> {
    return new Promise((resolve, reject) => {
        if (!arePluginsEnabled(store.getState())) {
            return;
        }
        const oldManifest = loadedPlugins[manifest.id];
        if (oldManifest && oldManifest.webapp?.bundle_path === manifest.webapp?.bundle_path) {
            resolve();
            return;
        }
        if (oldManifest) {
            store.dispatch(removeWebappPlugin(manifest));
        }
        function onLoad() {
            initializePlugin(manifest);
            console.log('Loaded ' + describePlugin(manifest));
            resolve();
        }
        function onError() {
            reject(new Error('Unable to load bundle for ' + describePlugin(manifest)));
        }
        let bundlePath = manifest.webapp?.bundle_path;
        if (bundlePath && bundlePath.includes('/static/') && !bundlePath.includes('/static/plugins/')) {
            bundlePath = bundlePath.replace('/static/', '/static/plugins/');
        }
        addPluginRegisteredHandler(manifest.id, onLoad);
        console.log('Loading ' + describePlugin(manifest));
        const script = document.createElement('script');
        script.id = 'plugin_' + manifest.id;
        script.type = 'text/javascript';
        script.src = getSiteURL() + bundlePath;
        script.defer = true;
        script.onerror = onError;
        document.getElementsByTagName('head')[0].appendChild(script);
        loadedPlugins[manifest.id] = manifest;
    });
}
function initializePlugin(manifest: PluginManifest): void {
    const plugin = window.plugins[manifest.id];
    const registry = new PluginRegistry(manifest.id);
    if (plugin && plugin.initialize) {
        plugin.initialize(registry, store);
    }
}
export function removePlugin(manifest: PluginManifest): void {
    if (!loadedPlugins[manifest.id]) {
        return;
    }
    console.log('Removing ' + describePlugin(manifest));
    delete loadedPlugins[manifest.id];
    store.dispatch(removeWebappPlugin(manifest));
    const plugin = window.plugins[manifest.id];
    if (plugin && plugin.uninitialize) {
        plugin.uninitialize();
    } else if (plugin && plugin.deinitialize) {
        plugin.deinitialize();
    }
    unregisterAllPluginWebSocketEvents(manifest.id);
    unregisterPluginReconnectHandler(manifest.id);
    store.dispatch(unregisterAdminConsolePlugin(manifest.id));
    unregisterPluginTranslationsSource(manifest.id);
    const script = document.getElementById('plugin_' + manifest.id);
    if (!script) {
        return;
    }
    script.parentNode?.removeChild(script);
    console.log('Removed ' + describePlugin(manifest));
}
type PluginRegisteredListener = () => void;
const pluginRegisteredHandlers = new Map<string, PluginRegisteredListener>();
function addPluginRegisteredHandler(pluginId: string, listener: PluginRegisteredListener) {
    pluginRegisteredHandlers.set(pluginId, listener);
}
function onPluginRegistered(pluginId: string) {
    const listener = pluginRegisteredHandlers.get(pluginId);
    if (listener) {
        pluginRegisteredHandlers.delete(pluginId);
        listener();
    } else {
        console.error('A plugin was registered, but no listener has been registered for it. It won\'t be loaded correctly.');
    }
}
export async function loadPluginsIfNecessary(): Promise<void> {
    if (!arePluginsEnabled(store.getState())) {
        return;
    }
    const oldManifests = store.getState().plugins.plugins as { [key: string]: PluginManifest };
    const {error} = await store.dispatch(getPlugins());
    if (error) {
        console.error(error);
        return;
    }
    const newManifests = store.getState().plugins.plugins as { [key: string]: PluginManifest };
    Object.values(newManifests).forEach((newManifest: PluginManifest) => {
        const oldManifest = oldManifests[newManifest.id];
        if (!oldManifest || oldManifest.version !== newManifest.version) {
            loadPlugin(newManifest).catch((loadErr: Error) => {
                console.error(loadErr.message);
            });
        }
    });
    Object.keys(oldManifests).forEach((id: string) => {
        if (!Object.hasOwn(newManifests, id)) {
            const oldManifest = oldManifests[id];
            removePlugin(oldManifest);
        }
    });
}