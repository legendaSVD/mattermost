import {composeWithDevTools} from '@redux-devtools/extension';
import {
    applyMiddleware,
    legacy_createStore,
} from 'redux';
import type {
    Reducer,
    Store,
} from 'redux';
import {withExtraArgument as thunkWithExtraArgument} from 'redux-thunk';
import type {GlobalState} from '@mattermost/types/store';
import {createReducer} from './helpers';
import initialState from './initial_state';
import reducerRegistry from './reducer_registry';
import serviceReducers from '../reducers';
export default function configureStore<S extends GlobalState>({
    appReducers,
    preloadedState,
}: {
    appReducers: Record<string, Reducer>;
    getAppReducers: () => Record<string, Reducer>;
    preloadedState: Partial<S>;
}): Store {
    const baseState = {
        ...initialState,
        ...preloadedState,
    };
    const composeEnhancers = composeWithDevTools({
        shouldHotReload: false,
        trace: true,
        traceLimit: 25,
        autoPause: true,
    });
    const middleware = applyMiddleware(
        thunkWithExtraArgument({loaders: {}}),
    );
    const enhancers = composeEnhancers(middleware);
    const baseReducer = createReducer(serviceReducers, appReducers);
    const store = legacy_createStore(
        baseReducer,
        baseState,
        enhancers,
    );
    reducerRegistry.setChangeListener((reducers: Record<string, Reducer>) => {
        store.replaceReducer(createReducer(reducers, serviceReducers, appReducers));
    });
    return store;
}