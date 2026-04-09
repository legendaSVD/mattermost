import {useCallback} from 'react';
import {useSelector, useDispatch, shallowEqual} from 'react-redux';
import {createSelector} from 'mattermost-redux/selectors/create_selector';
import {getCurrentTeamId} from 'mattermost-redux/selectors/entities/teams';
import {getCurrentUserId} from 'mattermost-redux/selectors/entities/users';
import {setGlobalItem} from 'actions/storage';
import {makeGetGlobalItem} from 'selectors/storage';
const currentUserAndTeamSuffix = createSelector('currentUserAndTeamSuffix', [
    getCurrentUserId,
    getCurrentTeamId,
], (
    userId,
    teamId,
) => {
    return `:${userId}:${teamId}`;
});
export function useGlobalState<TVal>(
    initialValue: TVal,
    name: string,
    suffix?: string,
): [TVal, (value: TVal) => ReturnType<typeof setGlobalItem>] {
    const dispatch = useDispatch();
    const defaultSuffix = useSelector(currentUserAndTeamSuffix);
    const suffixToUse = suffix || defaultSuffix;
    const storedKey = `${name}${suffixToUse}`;
    const value = useSelector(makeGetGlobalItem(storedKey, initialValue), shallowEqual);
    const setValue = useCallback((newValue: TVal) => dispatch(setGlobalItem(storedKey, newValue)), [storedKey]);
    return [
        value,
        setValue,
    ];
}