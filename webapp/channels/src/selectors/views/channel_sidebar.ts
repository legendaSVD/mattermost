import type {ChannelCategory} from '@mattermost/types/channel_categories';
import {CategorySorting} from '@mattermost/types/channel_categories';
import type {Channel} from '@mattermost/types/channels';
import type {RelationOneToOne} from '@mattermost/types/utilities';
import {createSelector} from 'mattermost-redux/selectors/create_selector';
import {
    makeGetCategoriesForTeam,
    makeGetChannelsByCategory,
    makeGetChannelIdsForCategory,
} from 'mattermost-redux/selectors/entities/channel_categories';
import {
    getAllChannels,
    getCurrentChannelId,
    getMyChannelMemberships,
    getUnreadChannelIds,
    sortUnreadChannels,
} from 'mattermost-redux/selectors/entities/channels';
import {shouldShowUnreadsCategory, isCollapsedThreadsEnabled} from 'mattermost-redux/selectors/entities/preferences';
import {getCurrentTeamId} from 'mattermost-redux/selectors/entities/teams';
import {memoizeResult} from 'mattermost-redux/utils/helpers';
import type {DraggingState, GlobalState} from 'types/store';
export function isUnreadFilterEnabled(state: GlobalState): boolean {
    return state.views.channelSidebar.unreadFilterEnabled && !shouldShowUnreadsCategory(state);
}
export const getCategoriesForCurrentTeam: (state: GlobalState) => ChannelCategory[] = (() => {
    const getCategoriesForTeam = makeGetCategoriesForTeam();
    return memoizeResult((state: GlobalState) => {
        const currentTeamId = getCurrentTeamId(state);
        return getCategoriesForTeam(state, currentTeamId);
    });
})();
export const getAutoSortedCategoryIds: (state: GlobalState) => Set<string> = (() => createSelector(
    'getAutoSortedCategoryIds',
    (state: GlobalState) => getCategoriesForCurrentTeam(state),
    (categories) => {
        return new Set(categories.filter((category) =>
            category.sorting === CategorySorting.Alphabetical ||
            category.sorting === CategorySorting.Recency).map((category) => category.id));
    },
))();
export const getChannelsByCategoryForCurrentTeam: (state: GlobalState) => RelationOneToOne<ChannelCategory, Channel[]> = (() => {
    const getChannelsByCategory = makeGetChannelsByCategory();
    return memoizeResult((state: GlobalState) => {
        const currentTeamId = getCurrentTeamId(state);
        return getChannelsByCategory(state, currentTeamId);
    });
})();
const getUnreadChannelIdsSet = createSelector(
    'getUnreadChannelIdsSet',
    (state: GlobalState) => getUnreadChannelIds(state, state.views.channel.lastUnreadChannel),
    (unreadChannelIds) => {
        return new Set(unreadChannelIds);
    },
);
export const getChannelsInCategoryOrder = (() => {
    return createSelector(
        'getChannelsInCategoryOrder',
        getCategoriesForCurrentTeam,
        getChannelsByCategoryForCurrentTeam,
        getCurrentChannelId,
        getUnreadChannelIdsSet,
        shouldShowUnreadsCategory,
        (categories, channelsByCategory, currentChannelId, unreadChannelIds, showUnreadsCategory) => {
            return categories.map((category) => {
                const channels = channelsByCategory[category.id];
                return channels.filter((channel: Channel) => {
                    const isUnread = unreadChannelIds.has(channel.id);
                    if (showUnreadsCategory) {
                        if (isUnread) {
                            return false;
                        }
                    }
                    if (category.collapsed) {
                        if (!isUnread && currentChannelId !== channel.id) {
                            return false;
                        }
                    }
                    return true;
                });
            }).flat();
        },
    );
})();
export const getUnreadChannels = (() => {
    const getUnsortedUnreadChannels = createSelector(
        'getUnreadChannels',
        getAllChannels,
        getUnreadChannelIdsSet,
        getCurrentChannelId,
        isUnreadFilterEnabled,
        (allChannels, unreadChannelIds, currentChannelId, unreadFilterEnabled) => {
            const unreadChannels: Channel[] = [];
            for (const channelId of unreadChannelIds) {
                const channel = allChannels[channelId];
                if (channel) {
                    if (channel.delete_at > 0 && channel.id !== currentChannelId) {
                        continue;
                    }
                    unreadChannels.push(channel);
                }
            }
            if (unreadFilterEnabled) {
                if (currentChannelId && unreadChannels.findIndex((channel) => channel.id === currentChannelId) === -1) {
                    if (allChannels[currentChannelId]) {
                        unreadChannels.push(allChannels[currentChannelId]);
                    }
                }
            }
            return unreadChannels;
        },
    );
    const sortChannels = createSelector(
        'sortChannels',
        (_: GlobalState, channels: Channel[]) => channels,
        getMyChannelMemberships,
        (state: GlobalState) => state.views.channel.lastUnreadChannel,
        isCollapsedThreadsEnabled,
        (channels, myMembers, lastUnreadChannel, crtEnabled) => {
            return sortUnreadChannels(channels, myMembers, lastUnreadChannel, crtEnabled);
        },
    );
    return (state: GlobalState) => {
        const channels = getUnsortedUnreadChannels(state);
        return sortChannels(state, channels);
    };
})();
function concatChannels(channelsA: Channel[], channelsB: Channel[]) {
    return [...channelsA, ...channelsB];
}
const memoizedConcatChannels = memoizeResult(concatChannels);
export const getDisplayedChannels = createSelector(
    'getDisplayedChannels',
    isUnreadFilterEnabled,
    getUnreadChannels,
    shouldShowUnreadsCategory,
    getChannelsInCategoryOrder,
    (unreadFilterEnabled, unreadChannels, showUnreadsCategory, channelsInCategoryOrder) => {
        if (unreadFilterEnabled) {
            return unreadChannels;
        }
        if (showUnreadsCategory) {
            return memoizedConcatChannels(unreadChannels, channelsInCategoryOrder);
        }
        return channelsInCategoryOrder;
    },
);
export function makeGetFilteredChannelIdsForCategory(): (state: GlobalState, category: ChannelCategory) => string[] {
    const getChannelIdsForCategory = makeGetChannelIdsForCategory();
    return createSelector(
        'makeGetFilteredChannelIdsForCategory',
        getChannelIdsForCategory,
        getUnreadChannelIdsSet,
        (state: GlobalState) => shouldShowUnreadsCategory(state),
        (channelIds, unreadChannelIdsSet, showUnreadsCategory) => {
            if (!showUnreadsCategory) {
                return channelIds;
            }
            const filtered = channelIds.filter((id) => !unreadChannelIdsSet.has(id));
            return filtered.length === channelIds.length ? channelIds : filtered;
        },
    );
}
export function makeGetUnreadIdsForCategory(): (state: GlobalState, category: ChannelCategory) => string[] {
    const getChannelIdsForCategory = makeGetChannelIdsForCategory();
    const emptyList: string[] = [];
    return createSelector(
        'makeGetFilteredChannelIdsForCategory',
        getChannelIdsForCategory,
        getUnreadChannelIdsSet,
        (state: GlobalState) => shouldShowUnreadsCategory(state),
        (channelIds, unreadChannelIdsSet, showUnreadsCategory) => {
            if (showUnreadsCategory) {
                return emptyList;
            }
            const filtered = channelIds.filter((id) => unreadChannelIdsSet.has(id));
            if (filtered.length === 0) {
                return emptyList;
            }
            return filtered.length === channelIds.length ? channelIds : filtered;
        },
    );
}
export function getDraggingState(state: GlobalState): DraggingState {
    return state.views.channelSidebar.draggingState;
}
export function isChannelSelected(state: GlobalState, channelId: string): boolean {
    return state.views.channelSidebar.multiSelectedChannelIds.indexOf(channelId) !== -1;
}