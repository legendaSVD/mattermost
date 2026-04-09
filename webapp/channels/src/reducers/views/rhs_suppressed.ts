import {UserTypes} from 'mattermost-redux/action_types';
import {ActionTypes} from 'utils/constants';
import type {MMAction} from 'types/store';
import type {ViewsState} from 'types/store/views';
export default function rhsSuppressed(state: ViewsState['rhsSuppressed'] = false, action: MMAction): boolean {
    switch (action.type) {
    case ActionTypes.SUPPRESS_RHS:
        return true;
    case ActionTypes.UNSUPPRESS_RHS:
        return false;
    case ActionTypes.UPDATE_RHS_STATE:
        if (action.state === null) {
            return state;
        }
        return false;
    case ActionTypes.SELECT_POST:
    case ActionTypes.SELECT_POST_CARD:
        if (action.postId === '') {
            return state;
        }
        return false;
    case UserTypes.LOGOUT_SUCCESS:
        return false;
    default:
        return state;
    }
}