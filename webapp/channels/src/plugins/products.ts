import type {Store} from 'redux';
import store from 'stores/redux_store';
import type {ActionFuncAsync, ThunkActionFunc} from 'types/store';
import PluginRegistry from './registry';
export abstract class ProductPlugin {
    abstract initialize(registry: PluginRegistry, store: Store): void;
    abstract uninitialize(): void;
}
export function initializeProducts(): ThunkActionFunc<Promise<unknown>> {
    return (dispatch) => {
        return Promise.all([
            dispatch(loadRemoteModules()),
            dispatch(configureClient()),
        ]);
    };
}
function configureClient(): ActionFuncAsync {
    return (dispatch, getState) => {
        return Promise.resolve({data: true});
    };
}
function loadRemoteModules(): ActionFuncAsync {
    return async () => {
        const products: any[] = [];
        await Promise.all(products.map(async (product) => {
            if (!REMOTE_CONTAINERS[product.id]) {
                console.log(`Product ${product.id} not found. Not loading it.`);
                return;
            }
            console.log(`Loading product ${product.id}...`);
            let imports;
            try {
                imports = product.load();
            } catch (e) {
                console.error(`Error loading ${product.id}`, e);
                return;
            }
            let index;
            try {
                index = await imports.index;
            } catch (e) {
                console.error(`Error loading index for ${product.id}`, e);
                return;
            }
            console.log(`Initializing product ${product.id}...`);
            try {
                initializeProduct(product.id, index.default);
            } catch (e) {
                console.error(`Error loading and initializing product ${product.id}`, e);
            }
            console.log(`Product ${product.id} initialized!`);
        }));
        return {data: true};
    };
}
function initializeProduct(id: string, Product: new () => ProductPlugin) {
    const plugin = new Product();
    const registry = new PluginRegistry(id);
    plugin.initialize(registry, store);
}