import type {Action, Dispatch} from 'redux';
import type {ThunkAction} from 'redux-thunk';
import type {GlobalState} from '@mattermost/types/store';
import type {MMReduxAction} from 'mattermost-redux/action_types';
import './extend_redux.d.ts';
import './extend_react_redux.d.ts';
export type DispatchFunc<TAction extends Action = MMReduxAction> = Dispatch<TAction>;
export type GetStateFunc<State = GlobalState> = () => State;
export type ActionResult<Data = any, Error = any> = {
    data?: Data;
    error?: Error;
};
export type ActionFunc<
    Data = unknown,
    State extends GlobalState = GlobalState,
    TAction extends Action = MMReduxAction
> = ThunkAction<ActionResult<Data>, State, unknown, TAction>;
export type ActionFuncAsync<
    Data = unknown,
    State extends GlobalState = GlobalState,
    TAction extends Action = MMReduxAction
> = ThunkAction<Promise<ActionResult<Data>>, State, unknown, TAction>;
export type ThunkActionFunc<
    ReturnType,
    State extends GlobalState = GlobalState,
    TAction extends Action = MMReduxAction
> = ThunkAction<ReturnType, State, unknown, TAction>;