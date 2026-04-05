import type {Channel, ChannelMembership} from '@mattermost/types/channels';
import type {RelationOneToOne} from '@mattermost/types/utilities';
import {isChannelMuted} from 'mattermost-redux/utils/channel_utils';
import {memoizeResult} from 'mattermost-redux/utils/helpers';
enum Priority {
    high = 1,
    medium,
    low
}
enum PrefetchLimits {
    mentionMax = 10,
    unreadMax = 20,
}
export const prefetchQueue = memoizeResult((
    unreadChannels: Channel[],
    memberships: RelationOneToOne<Channel, ChannelMembership>,
    collapsedThreads: boolean,
) => {
    const unreadChannelsCount = unreadChannels.length;
    let result: {
        1: string[];
        2: string[];
        3: string[];
    } = {
        [Priority.high]: [],
        [Priority.medium]: [],
        [Priority.low]: [],
    };
    if (!unreadChannelsCount || unreadChannelsCount > PrefetchLimits.unreadMax) {
        return result;
    }
    for (const channel of unreadChannels) {
        const channelId = channel.id;
        const membership = memberships[channelId];
        if (unreadChannelsCount >= PrefetchLimits.mentionMax && result[Priority.high].length >= PrefetchLimits.mentionMax) {
            break;
        }
        if (membership && !isChannelMuted(membership)) {
            if (collapsedThreads ? membership.mention_count_root : membership.mention_count) {
                result = {
                    ...result,
                    [Priority.high]: [...result[Priority.high], channelId],
                };
            } else if (
                membership.notify_props &&
                membership.notify_props.mark_unread !== 'mention' &&
                unreadChannelsCount < PrefetchLimits.mentionMax
            ) {
                result = {
                    ...result,
                    [Priority.medium]: [...result[Priority.medium], channelId],
                };
            }
        }
    }
    return result;
});