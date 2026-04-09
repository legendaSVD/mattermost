declare const REMOTE_CONTAINERS: Record<string, string>;
declare module 'boards' {
    import {ProductPlugin} from 'plugins/products';
    export default class Plugin extends ProductPlugin {
        initialize(registry: PluginRegistry, store: Store): void;
        uninitialize(): void;
    }
}
declare module 'boards/manifest' {
    import type {PluginManifest} from '@mattermost/types/plugins';
    const module: PluginManifest;
    export default module;
}
declare module 'playbooks' {
    import {ProductPlugin} from 'plugins/products';
    export default class Plugin extends ProductPlugin {
        initialize(registry: PluginRegistry, store: Store): void;
        uninitialize(): void;
    }
}
declare module 'playbooks/manifest' {
    import type {PluginManifest} from '@mattermost/types/plugins';
    const module: PluginManifest;
    export default module;
}