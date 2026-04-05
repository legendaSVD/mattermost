import {ActionTypes} from 'utils/constants';
export function incrementWsErrorCount() {
    return async (dispatch) => {
        dispatch({
            type: ActionTypes.INCREMENT_WS_ERROR_COUNT,
        });
    };
}
export function resetWsErrorCount() {
    return async (dispatch) => {
        dispatch({
            type: ActionTypes.RESET_WS_ERROR_COUNT,
        });
    };
}