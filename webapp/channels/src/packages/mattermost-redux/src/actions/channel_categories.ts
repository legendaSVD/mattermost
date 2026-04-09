import {batchActions} from 'redux-batched-actions';
import type {OrderedChannelCategories, ChannelCategory} from '@mattermost/types/channel_categories';
import {CategorySorting} from '@mattermost/types/channel_categories';
import type {Channel} from '@mattermost/types/channels';
import {ChannelCategoryTypes, ChannelTypes} from 'mattermost-redux/action_types';
import {logError} from 'mattermost-redux/actions/errors';
import {forceLogoutIfNecessary} from 'mattermost-redux/actions/helpers';
import {Client4} from 'mattermost-redux/client';
import {CategoryTypes} from 'mattermost-redux/constants/channel_categories';
import {
    getAllCategoriesByIds,
    getCategory,
    getCategoryIdsForTeam,
    getCategoryInTeamByType,
    getCategoryInTeamWithChannel,
} from 'mattermost-redux/selectors/entities/channel_categories';
import {getCurrentUserId} from 'mattermost-redux/selectors/entities/users';
import type {
    ActionFuncAsync,
    ThunkActionFunc,
} from 'mattermost-redux/types/actions';
import {insertMultipleWithoutDuplicates, insertWithoutDuplicates, removeItem} from 'mattermost-redux/utils/array_utils';
import {General} from '../constants';
export function setCategoryCollapsed(categoryId: string, collapsed: boolean) {
    return patchCategory(categoryId, {
        collapsed,
    });
}
export function setCategorySorting(categoryId: string, sorting: CategorySorting) {
    return patchCategory(categoryId, {
        sorting,
    });
}
export function patchCategory(categoryId: string, patch: Partial<ChannelCategory>): ActionFuncAsync {
    return async (dispatch, getState) => {
        const state = getState();
        const currentUserId = getCurrentUserId(state);
        const category = getCategory(state, categoryId);
        const patchedCategory = {
            ...category,
            ...patch,
        };
        dispatch({
            type: ChannelCategoryTypes.RECEIVED_CATEGORY,
            data: patchedCategory,
        });
        try {
            await Client4.updateChannelCategory(currentUserId, category.team_id, patchedCategory);
        } catch (error) {
            dispatch({
                type: ChannelCategoryTypes.RECEIVED_CATEGORY,
                data: category,
            });
            forceLogoutIfNecessary(error, dispatch, getState);
            dispatch(logError(error));
            return {error};
        }
        return {data: patchedCategory};
    };
}
export function setCategoryMuted(categoryId: string, muted: boolean): ActionFuncAsync {
    return async (dispatch, getState) => {
        const state = getState();
        const category = getCategory(state, categoryId);
        const result = await dispatch(updateCategory({
            ...category,
            muted,
        }));
        if ('error' in result) {
            return result;
        }
        const updated = result.data as ChannelCategory;
        dispatch(batchActions([
            {
                type: ChannelCategoryTypes.RECEIVED_CATEGORY,
                data: updated,
            },
            ...(updated.channel_ids.map((channelId) => ({
                type: ChannelTypes.SET_CHANNEL_MUTED,
                data: {
                    channelId,
                    muted,
                },
            }))),
        ]));
        return {data: true};
    };
}
function updateCategory(category: ChannelCategory): ActionFuncAsync {
    return async (dispatch, getState) => {
        const state = getState();
        const currentUserId = getCurrentUserId(state);
        let updatedCategory;
        try {
            updatedCategory = await Client4.updateChannelCategory(currentUserId, category.team_id, category);
        } catch (error) {
            forceLogoutIfNecessary(error, dispatch, getState);
            dispatch(logError(error));
            return {error};
        }
        return {data: updatedCategory};
    };
}
export function fetchMyCategories(teamId: string, isWebSocket?: boolean): ThunkActionFunc<unknown> {
    return async (dispatch, getState) => {
        const currentUserId = getCurrentUserId(getState());
        let data: OrderedChannelCategories;
        try {
            data = await Client4.getChannelCategories(currentUserId, teamId);
        } catch (error) {
            forceLogoutIfNecessary(error, dispatch, getState);
            dispatch(logError(error));
            return {error};
        }
        return dispatch(batchActions([
            {
                type: ChannelCategoryTypes.RECEIVED_CATEGORIES,
                data: data.categories,
                isWebSocket,
            },
            {
                type: ChannelCategoryTypes.RECEIVED_CATEGORY_ORDER,
                data: {
                    teamId,
                    order: data.order,
                },
            },
        ]));
    };
}
export function addChannelToInitialCategory(channel: Channel, setOnServer = false): ActionFuncAsync {
    return async (dispatch, getState) => {
        const state = getState();
        const categories = Object.values(getAllCategoriesByIds(state));
        if (channel.type === General.DM_CHANNEL || channel.type === General.GM_CHANNEL) {
            const allDmCategories = categories.filter((category) => category.type === CategoryTypes.DIRECT_MESSAGES);
            const channelInCategories = categories.filter((category) => {
                return category.channel_ids.findIndex((channelId) => channelId === channel.id) !== -1;
            });
            const dmCategories = allDmCategories.filter((dmCategory) => {
                return channelInCategories.findIndex((category) => dmCategory.team_id === category.team_id) === -1;
            });
            return dispatch({
                type: ChannelCategoryTypes.RECEIVED_CATEGORIES,
                data: dmCategories.map((category) => ({
                    ...category,
                    channel_ids: insertWithoutDuplicates(category.channel_ids, channel.id, 0),
                })),
            });
        }
        if (categories.some((category) => category.channel_ids.some((channelId) => channelId === channel.id))) {
            return {data: false};
        }
        const channelsCategory = getCategoryInTeamByType(state, channel.team_id, CategoryTypes.CHANNELS);
        if (!channelsCategory) {
            return {data: false};
        }
        if (setOnServer) {
            return dispatch(addChannelToCategory(channelsCategory.id, channel.id));
        }
        return dispatch({
            type: ChannelCategoryTypes.RECEIVED_CATEGORY,
            data: {
                ...channelsCategory,
                channel_ids: insertWithoutDuplicates(channelsCategory.channel_ids, channel.id, 0),
            },
        });
    };
}
export function addChannelToCategory(categoryId: string, channelId: string): ActionFuncAsync {
    return moveChannelToCategory(categoryId, channelId, 0, false);
}
export function moveChannelToCategory(categoryId: string, channelId: string, newIndex: number, setManualSorting = true): ActionFuncAsync {
    return async (dispatch, getState) => {
        const state = getState();
        const targetCategory = getCategory(state, categoryId);
        const currentUserId = getCurrentUserId(state);
        let sorting = targetCategory.sorting;
        if (setManualSorting &&
            targetCategory.type !== CategoryTypes.DIRECT_MESSAGES &&
            targetCategory.sorting === CategorySorting.Default) {
            sorting = CategorySorting.Manual;
        }
        const categories = [{
            ...targetCategory,
            sorting,
            channel_ids: insertWithoutDuplicates(targetCategory.channel_ids, channelId, newIndex),
        }];
        const sourceCategory = getCategoryInTeamWithChannel(getState(), targetCategory.team_id, channelId);
        if (sourceCategory && sourceCategory.id !== targetCategory.id) {
            categories.push({
                ...sourceCategory,
                channel_ids: removeItem(sourceCategory.channel_ids, channelId),
            });
        }
        const result = dispatch({
            type: ChannelCategoryTypes.RECEIVED_CATEGORIES,
            data: categories,
        });
        try {
            await Client4.updateChannelCategories(currentUserId, targetCategory.team_id, categories);
        } catch (error) {
            forceLogoutIfNecessary(error, dispatch, getState);
            dispatch(logError(error));
            const originalCategories = [targetCategory];
            if (sourceCategory && sourceCategory.id !== targetCategory.id) {
                originalCategories.push(sourceCategory);
            }
            dispatch({
                type: ChannelCategoryTypes.RECEIVED_CATEGORIES,
                data: originalCategories,
            });
            return {error};
        }
        return result;
    };
}
export function moveChannelsToCategory(categoryId: string, channelIds: string[], newIndex: number, setManualSorting = true): ActionFuncAsync {
    return async (dispatch, getState) => {
        const state = getState();
        const targetCategory = getCategory(state, categoryId);
        const currentUserId = getCurrentUserId(state);
        let sorting = targetCategory.sorting;
        if (setManualSorting &&
            targetCategory.type !== CategoryTypes.DIRECT_MESSAGES &&
            targetCategory.sorting === CategorySorting.Default) {
            sorting = CategorySorting.Manual;
        }
        let categories = {
            [targetCategory.id]: {
                ...targetCategory,
                sorting,
                channel_ids: insertMultipleWithoutDuplicates(targetCategory.channel_ids, channelIds, newIndex),
            },
        };
        let unmodifiedCategories = {[targetCategory.id]: targetCategory};
        let sourceCategories: Record<string, string> = {};
        channelIds.forEach((channelId) => {
            const sourceCategory = getCategoryInTeamWithChannel(getState(), targetCategory.team_id, channelId);
            if (sourceCategory && sourceCategory.id !== targetCategory.id) {
                unmodifiedCategories = {
                    ...unmodifiedCategories,
                    [sourceCategory.id]: sourceCategory,
                };
                sourceCategories = {...sourceCategories, [channelId]: sourceCategory.id};
                categories = {
                    ...categories,
                    [sourceCategory.id]: {
                        ...(categories[sourceCategory.id] || sourceCategory),
                        channel_ids: removeItem((categories[sourceCategory.id] || sourceCategory).channel_ids, channelId),
                    },
                };
            }
        });
        const categoriesArray = Object.values(categories).reduce((allCategories: ChannelCategory[], category) => {
            allCategories.push(category);
            return allCategories;
        }, []);
        const result = dispatch({
            type: ChannelCategoryTypes.RECEIVED_CATEGORIES,
            data: categoriesArray,
        });
        try {
            await Client4.updateChannelCategories(currentUserId, targetCategory.team_id, categoriesArray);
        } catch (error) {
            forceLogoutIfNecessary(error, dispatch, getState);
            dispatch(logError(error));
            const originalCategories = Object.values(unmodifiedCategories).reduce((allCategories: ChannelCategory[], category) => {
                allCategories.push(category);
                return allCategories;
            }, []);
            dispatch({
                type: ChannelCategoryTypes.RECEIVED_CATEGORIES,
                data: originalCategories,
            });
            return {error};
        }
        return result;
    };
}
export function moveCategory(teamId: string, categoryId: string, newIndex: number): ActionFuncAsync {
    return async (dispatch, getState) => {
        const state = getState();
        const order = getCategoryIdsForTeam(state, teamId)!;
        const currentUserId = getCurrentUserId(state);
        const newOrder = insertWithoutDuplicates(order, categoryId, newIndex);
        const result = dispatch({
            type: ChannelCategoryTypes.RECEIVED_CATEGORY_ORDER,
            data: {
                teamId,
                order: newOrder,
            },
        });
        try {
            await Client4.updateChannelCategoryOrder(currentUserId, teamId, newOrder);
        } catch (error) {
            forceLogoutIfNecessary(error, dispatch, getState);
            dispatch(logError(error));
            dispatch({
                type: ChannelCategoryTypes.RECEIVED_CATEGORY_ORDER,
                data: {
                    teamId,
                    order,
                },
            });
            return {error};
        }
        return result;
    };
}
export function receivedCategoryOrder(teamId: string, order: string[]) {
    return {
        type: ChannelCategoryTypes.RECEIVED_CATEGORY_ORDER,
        data: {
            teamId,
            order,
        },
    };
}
export function createCategory(teamId: string, displayName: string, channelIds: Array<Channel['id']> = []): ActionFuncAsync<ChannelCategory> {
    return async (dispatch, getState) => {
        const currentUserId = getCurrentUserId(getState());
        let newCategory;
        try {
            newCategory = await Client4.createChannelCategory(currentUserId, teamId, {
                team_id: teamId,
                user_id: currentUserId,
                display_name: displayName,
                channel_ids: channelIds,
            });
        } catch (error) {
            forceLogoutIfNecessary(error, dispatch, getState);
            dispatch(logError(error));
            return {error};
        }
        return {data: newCategory};
    };
}
export function renameCategory(categoryId: string, displayName: string) {
    return patchCategory(categoryId, {
        display_name: displayName,
    });
}
export function deleteCategory(categoryId: string): ActionFuncAsync {
    return async (dispatch, getState) => {
        const state = getState();
        const category = getCategory(state, categoryId);
        const currentUserId = getCurrentUserId(state);
        try {
            await Client4.deleteChannelCategory(currentUserId, category.team_id, category.id);
        } catch (error) {
            forceLogoutIfNecessary(error, dispatch, getState);
            dispatch(logError(error));
            return {error};
        }
        return {data: true};
    };
}