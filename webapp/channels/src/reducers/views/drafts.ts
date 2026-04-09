import {combineReducers} from 'redux';
import {ActionTypes} from 'utils/constants';
import type {MMAction} from 'types/store';
function remotes(state: Record<string, boolean> = {}, action: MMAction) {
    switch (action.type) {
    case ActionTypes.SET_DRAFT_SOURCE:
        return {
            ...state,
            [action.data.key]: action.data.isRemote,
        };
    default:
        return state;
    }
}
export default combineReducers({
    remotes,
});