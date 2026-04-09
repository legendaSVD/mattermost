import type {GlobalState as BaseGlobalState} from '@mattermost/types/store';
import type {MMReduxAction} from 'mattermost-redux/action_types';
import type * as MMReduxTypes from 'mattermost-redux/types/actions';
import type {PluginsState} from './plugins';
import type {StorageState} from './storage';
import type {ViewsState} from './views';
export type DraggingState = {
    state?: string;
    type?: string;
    id?: string;
}
export type GlobalState = BaseGlobalState & {
    plugins: PluginsState;
    storage: StorageState;
    views: ViewsState;
};
export type MMAction = MMReduxAction;
export type DispatchFunc = MMReduxTypes.DispatchFunc<MMAction>;
export type GetStateFunc<State extends GlobalState = GlobalState> = MMReduxTypes.GetStateFunc<State>;
export type ActionFunc<
    Data = unknown,
    State extends GlobalState = GlobalState,
> = MMReduxTypes.ActionFunc<Data, State, MMAction>;
export type ActionFuncAsync<
    Data = unknown,
    State extends GlobalState = GlobalState,
> = MMReduxTypes.ActionFuncAsync<Data, State, MMAction>;
export type ThunkActionFunc<
    ReturnType,
    State extends GlobalState = GlobalState
> = MMReduxTypes.ThunkActionFunc<ReturnType, State, MMAction>;