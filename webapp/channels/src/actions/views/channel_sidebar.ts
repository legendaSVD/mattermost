import {createCategory as createCategoryRedux, moveChannelsToCategory} from 'mattermost-redux/actions/channel_categories';
import {General} from 'mattermost-redux/constants';
import {CategoryTypes} from 'mattermost-redux/constants/channel_categories';
import {getCategory, makeGetChannelIdsForCategory} from 'mattermost-redux/selectors/entities/channel_categories';
import {getCurrentChannelId} from 'mattermost-redux/selectors/entities/channels';
import {insertMultipleWithoutDuplicates} from 'mattermost-redux/utils/array_utils';
import {getCategoriesForCurrentTeam, getChannelsInCategoryOrder, getDisplayedChannels} from 'selectors/views/channel_sidebar';
import {ActionTypes} from 'utils/constants';
import type {ActionFunc, ActionFuncAsync, DraggingState, GlobalState} from 'types/store';
export function setUnreadFilterEnabled(enabled: boolean) {
    return {
        type: ActionTypes.SET_UNREAD_FILTER_ENABLED,
        enabled,
    };
}
export function setDraggingState(data: DraggingState) {
    return {
        type: ActionTypes.SIDEBAR_DRAGGING_SET_STATE,
        data,
    };
}
export function stopDragging() {
    return {type: ActionTypes.SIDEBAR_DRAGGING_STOP};
}
export function createCategory(teamId: string, displayName: string, channelIds?: string[]): ActionFuncAsync<unknown> {
    return async (dispatch, getState) => {
        if (channelIds) {
            const state = getState();
            const multiSelectedChannelIds = state.views.channelSidebar.multiSelectedChannelIds;
            channelIds.forEach((channelId) => {
                if (multiSelectedChannelIds.indexOf(channelId) >= 0) {
                    dispatch(multiSelectChannelAdd(channelId));
                }
            });
        }
        const result = await dispatch(createCategoryRedux(teamId, displayName, channelIds));
        return dispatch({
            type: ActionTypes.ADD_NEW_CATEGORY_ID,
            data: result.data!.id,
        });
    };
}
export function addChannelsInSidebar(categoryId: string, channelId: string) {
    return moveChannelsInSidebar(categoryId, 0, channelId, false);
}
export function moveChannelsInSidebar(categoryId: string, targetIndex: number, draggableChannelId: string, setManualSorting = true): ActionFuncAsync<unknown> {
    return (dispatch, getState) => {
        const state = getState();
        const multiSelectedChannelIds = state.views.channelSidebar.multiSelectedChannelIds;
        let channelIds = [];
        if (multiSelectedChannelIds.length && multiSelectedChannelIds.indexOf(draggableChannelId) !== -1) {
            const categories = getCategoriesForCurrentTeam(state);
            const displayedChannels = getDisplayedChannels(state);
            let channelsToMove = [draggableChannelId];
            const targetCategory = categories.find((category) => category.id === categoryId);
            channelsToMove = multiSelectedChannelIds.filter((channelId) => {
                const selectedChannel = displayedChannels.find((channel) => channelId === channel.id);
                const isDMGM = selectedChannel?.type === General.DM_CHANNEL || selectedChannel?.type === General.GM_CHANNEL;
                return targetCategory?.type === CategoryTypes.CUSTOM || targetCategory?.type === CategoryTypes.FAVORITES || (isDMGM && targetCategory?.type === CategoryTypes.DIRECT_MESSAGES) || (!isDMGM && targetCategory?.type !== CategoryTypes.DIRECT_MESSAGES);
            });
            const displayedChannelIds = displayedChannels.map((channel) => channel.id);
            channelsToMove.sort((a, b) => displayedChannelIds.indexOf(a) - displayedChannelIds.indexOf(b));
            channelsToMove.forEach((channelId) => dispatch(multiSelectChannelAdd(channelId)));
            channelIds = channelsToMove;
        } else {
            channelIds = [draggableChannelId];
        }
        const newIndex = adjustTargetIndexForMove(state, categoryId, channelIds, targetIndex, draggableChannelId);
        return dispatch(moveChannelsToCategory(categoryId, channelIds, newIndex, setManualSorting));
    };
}
export function adjustTargetIndexForMove(state: GlobalState, categoryId: string, channelIds: string[], targetIndex: number, draggableChannelId: string) {
    if (targetIndex === 0) {
        return 0;
    }
    const category = getCategory(state, categoryId);
    const filteredChannelIds = makeGetChannelIdsForCategory()(state, category);
    const removedChannelsAboveInsert = filteredChannelIds.filter((channel, index) => channel !== draggableChannelId && channelIds.indexOf(channel) !== -1 && index <= targetIndex);
    const shiftedIndex = targetIndex - removedChannelsAboveInsert.length;
    if (category.channel_ids.length === filteredChannelIds.length) {
        return shiftedIndex;
    }
    const updatedChannelIds = insertMultipleWithoutDuplicates(filteredChannelIds, channelIds, shiftedIndex);
    const previousChannelId = updatedChannelIds[updatedChannelIds.indexOf(channelIds[0]) - 1];
    let newIndex = category.channel_ids.indexOf(previousChannelId) + 1;
    const sourceIndex = category.channel_ids.indexOf(channelIds[0]);
    if (sourceIndex !== -1 && sourceIndex < newIndex) {
        newIndex -= 1;
    }
    return Math.max(newIndex - removedChannelsAboveInsert.length, 0);
}
export function clearChannelSelection(): ActionFunc<unknown> {
    return (dispatch, getState) => {
        const state = getState();
        if (state.views.channelSidebar.multiSelectedChannelIds.length === 0) {
            return {data: false};
        }
        dispatch({
            type: ActionTypes.MULTISELECT_CHANNEL_CLEAR,
        });
        return {data: true};
    };
}
export function multiSelectChannelAdd(channelId: string): ActionFunc<unknown> {
    return (dispatch, getState) => {
        const state = getState();
        const multiSelectedChannelIds = state.views.channelSidebar.multiSelectedChannelIds;
        if (!multiSelectedChannelIds.length) {
            const currentChannel = getCurrentChannelId(state);
            dispatch({
                type: ActionTypes.MULTISELECT_CHANNEL,
                data: currentChannel,
            });
        }
        return dispatch({
            type: ActionTypes.MULTISELECT_CHANNEL_ADD,
            data: channelId,
        });
    };
}
export function multiSelectChannelTo(channelId: string): ActionFunc<unknown> {
    return (dispatch, getState) => {
        const state = getState();
        const multiSelectedChannelIds = state.views.channelSidebar.multiSelectedChannelIds;
        let lastSelected = state.views.channelSidebar.lastSelectedChannel;
        if (!multiSelectedChannelIds.length) {
            const currentChannel = getCurrentChannelId(state);
            dispatch({
                type: ActionTypes.MULTISELECT_CHANNEL,
                data: currentChannel,
            });
            lastSelected = currentChannel;
        }
        const allChannelsIdsInOrder = getChannelsInCategoryOrder(state).map((channel) => channel.id);
        const indexOfNew: number = allChannelsIdsInOrder.indexOf(channelId);
        const indexOfLast: number = allChannelsIdsInOrder.indexOf(lastSelected);
        if (indexOfNew === indexOfLast) {
            return {data: false};
        }
        const start: number = Math.min(indexOfLast, indexOfNew);
        const end: number = Math.max(indexOfLast, indexOfNew);
        const inBetween = allChannelsIdsInOrder.slice(start, end + 1);
        return dispatch({
            type: ActionTypes.MULTISELECT_CHANNEL_TO,
            data: inBetween,
        });
    };
}