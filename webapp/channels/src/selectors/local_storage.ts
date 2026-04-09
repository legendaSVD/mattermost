import {getCurrentTeamId, getTeamByName} from 'mattermost-redux/selectors/entities/teams';
import {getCurrentUserId} from 'mattermost-redux/selectors/entities/users';
import localStorageStore from 'stores/local_storage_store';
import type {GlobalState} from 'types/store';
export const getLastViewedChannelName = (state: GlobalState) => {
    const userId = getCurrentUserId(state);
    const teamId = getCurrentTeamId(state);
    return localStorageStore.getPreviousChannelName(userId, teamId);
};
export const getPenultimateViewedChannelName = (state: GlobalState) => {
    const userId = getCurrentUserId(state);
    const teamId = getCurrentTeamId(state);
    return localStorageStore.getPenultimateChannelName(userId, teamId);
};
export const getLastViewedChannelNameByTeamName = (state: GlobalState, teamName: string) => {
    const userId = getCurrentUserId(state);
    const team = getTeamByName(state, teamName);
    const teamId = team && team.id;
    return localStorageStore.getPreviousChannelName(userId, teamId || '');
};
export const getLastViewedTypeByTeamName = (state: GlobalState, teamName: string) => {
    const userId = getCurrentUserId(state);
    const team = getTeamByName(state, teamName);
    const teamId = team && team.id;
    return localStorageStore.getPreviousViewedType(userId, teamId || '');
};
export const getPreviousTeamId = (state: GlobalState) => {
    const userId = getCurrentUserId(state);
    return localStorageStore.getPreviousTeamId(userId);
};
export const getPreviousTeamLastViewedType = (state: GlobalState) => {
    const previousTeamID = getPreviousTeamId(state);
    const userId = getCurrentUserId(state);
    return localStorageStore.getPreviousViewedType(userId, previousTeamID || '', state);
};