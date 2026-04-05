import {ActionTypes} from 'utils/constants';
export function dismissNotice(type) {
    return (dispatch) => {
        dispatch({
            type: ActionTypes.DISMISS_NOTICE,
            data: type,
        });
        return {data: true};
    };
}