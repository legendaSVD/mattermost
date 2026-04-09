import {act, render, renderHook} from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import type {History} from 'history';
import {createBrowserHistory} from 'history';
import React from 'react';
import {IntlProvider} from 'react-intl';
import {Provider} from 'react-redux';
import {Router} from 'react-router-dom';
import type {Reducer} from 'redux';
import type {DeepPartial} from '@mattermost/types/utilities';
import configureStore from 'store';
import globalStore from 'stores/redux_store';
import SharedPackageProvider from 'components/root/shared_package_provider';
import WebSocketClient from 'client/web_websocket_client';
import mergeObjects from 'packages/mattermost-redux/test/merge_objects';
import mockStore from 'tests/test_store';
import {WebSocketContext} from 'utils/use_websocket';
import type {GlobalState} from 'types/store';
export * from '@testing-library/react';
export {userEvent};
export type IntlOptions = {
    messages?: Record<string, string>;
    locale?: string;
}
export type FullContextOptions = {
    intlMessages?: Record<string, string>;
    locale?: string;
    useMockedStore?: boolean;
    pluginReducers?: string[];
    history?: History<unknown>;
}
export const renderWithContext = (
    component: React.ReactElement,
    initialState: DeepPartial<GlobalState> = {},
    partialOptions?: FullContextOptions,
) => {
    const options = {
        intlMessages: partialOptions?.intlMessages,
        locale: partialOptions?.locale ?? 'en',
        useMockedStore: partialOptions?.useMockedStore ?? false,
    };
    const testStore = configureOrMockStore(initialState, options.useMockedStore, partialOptions?.pluginReducers);
    const renderState = {
        component,
        history: partialOptions?.history ?? createBrowserHistory(),
        options,
        store: testStore,
    };
    replaceGlobalStore(() => renderState.store);
    const results = render(component, {
        wrapper: ({children}) => {
            return <Providers {...renderState}>{children}</Providers>;
        },
    });
    return {
        ...results,
        rerender: (newComponent: React.ReactElement) => {
            renderState.component = newComponent;
            results.rerender(renderState.component);
        },
        replaceStoreState: (newInitialState: DeepPartial<GlobalState>) => {
            renderState.store = configureOrMockStore(newInitialState, renderState.options.useMockedStore, partialOptions?.pluginReducers);
            results.rerender(renderState.component);
        },
        updateStoreState: (stateDiff: DeepPartial<GlobalState>) => {
            const newInitialState = mergeObjects(renderState.store.getState(), stateDiff);
            renderState.store = configureOrMockStore(newInitialState, renderState.options.useMockedStore, partialOptions?.pluginReducers);
            results.rerender(renderState.component);
        },
        store: testStore,
    };
};
export const renderHookWithContext = <TProps, TResult>(
    callback: (props: TProps) => TResult,
    initialState: DeepPartial<GlobalState> = {},
    partialOptions?: FullContextOptions,
) => {
    const options = {
        intlMessages: partialOptions?.intlMessages,
        locale: partialOptions?.locale ?? 'en',
        useMockedStore: partialOptions?.useMockedStore ?? false,
    };
    const testStore = configureOrMockStore(initialState, options.useMockedStore, partialOptions?.pluginReducers);
    const renderState = {
        callback,
        history: partialOptions?.history ?? createBrowserHistory(),
        options,
        store: testStore,
    };
    replaceGlobalStore(() => renderState.store);
    const results = renderHook(callback, {
        wrapper: ({children}) => {
            return <Providers {...renderState}>{children}</Providers>;
        },
    });
    return {
        ...results,
        replaceStoreState: (newInitialState: DeepPartial<GlobalState>) => {
            renderState.store = configureOrMockStore(newInitialState, renderState.options.useMockedStore, partialOptions?.pluginReducers);
            results.rerender();
        },
    };
};
function configureOrMockStore<T>(initialState: DeepPartial<T>, useMockedStore: boolean, extraReducersKeys?: string[]) {
    let testReducers;
    if (extraReducersKeys) {
        const newReducers: Record<string, Reducer> = {};
        extraReducersKeys.forEach((v) => {
            newReducers[v] = (state = null) => state;
        });
        testReducers = newReducers;
    }
    let testStore = configureStore(initialState, testReducers);
    if (useMockedStore) {
        testStore = mockStore(testStore.getState());
    }
    return testStore;
}
function replaceGlobalStore(getStore: () => any) {
    jest.spyOn(globalStore, 'dispatch').mockImplementation((...args) => getStore().dispatch(...args));
    jest.spyOn(globalStore, 'getState').mockImplementation(() => getStore().getState());
    jest.spyOn(globalStore, 'replaceReducer').mockImplementation((...args) => getStore().replaceReducer(...args));
    jest.spyOn(globalStore, '@@observable' as any).mockImplementation((...args: any[]) => getStore()['@@observable'](...args));
    jest.spyOn(globalStore, 'subscribe').mockImplementation((...args) => getStore().subscribe(...args));
}
type Opts = {
    intlMessages: Record<string, string> | undefined;
    locale: string;
    useMockedStore: boolean;
}
type RenderStateProps = {children: React.ReactNode; store: any; history: History<unknown>; options: Opts}
const Providers = ({children, store, history, options}: RenderStateProps) => {
    return (
        <Provider store={store}>
            <Router history={history}>
                <SharedPackageProvider>
                    <IntlProvider
                        locale={options.locale}
                        messages={options.intlMessages}
                    >
                        <WebSocketContext.Provider value={WebSocketClient}>
                            {children}
                        </WebSocketContext.Provider>
                    </IntlProvider>
                </SharedPackageProvider>
            </Router>
        </Provider>
    );
};
export function waitForEnzymeSnapshot() {
    return act(async () => {});
}