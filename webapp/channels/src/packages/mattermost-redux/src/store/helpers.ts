import {combineReducers} from 'redux';
import type {AnyAction, Reducer} from 'redux';
import {enableBatching} from 'redux-batched-actions';
import deepFreezeAndThrowOnMutation from 'mattermost-redux/utils/deep_freeze';
export function createReducer(...reducerSets: Array<Record<string, Reducer>>) {
    let reducer: Reducer = combineReducers(reducerSets.reduce((fullSet, reducerSet) => {
        return {...fullSet, ...reducerSet};
    }, {}));
    reducer = enableBatching(reducer);
    reducer = enableFreezing(reducer);
    return reducer;
}
function enableFreezing<S, A extends AnyAction>(reducer: Reducer<S, A>) {
    if (process.env.NODE_ENV === 'production') {
        return reducer;
    }
    const frozenReducer = (state: S | undefined, action: A): S => {
        const nextState = reducer(state, action);
        if (nextState !== state) {
            deepFreezeAndThrowOnMutation(nextState);
        }
        return nextState;
    };
    return frozenReducer;
}