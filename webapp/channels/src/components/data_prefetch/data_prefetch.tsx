import PQueue from 'p-queue';
import React from 'react';
import type {Channel} from '@mattermost/types/channels';
import type {ActionResult} from 'mattermost-redux/types/actions';
import {loadProfilesForSidebar} from 'actions/user_actions';
import {Constants} from 'utils/constants';
const queue = new PQueue({concurrency: 2});
type Props = {
    currentChannelId: string;
    prefetchQueueObj: Record<string, string[]>;
    prefetchRequestStatus: Record<string, string>;
    sidebarLoaded: boolean;
    unreadChannels: Channel[];
    actions: {
        prefetchChannelPosts: (channelId: string, delay?: number) => Promise<ActionResult>;
    };
}
export default class DataPrefetch extends React.PureComponent<Props> {
    private prefetchTimeout?: number;
    async componentDidUpdate(prevProps: Props) {
        const {currentChannelId, prefetchQueueObj, sidebarLoaded} = this.props;
        if (sidebarLoaded && !prevProps.sidebarLoaded) {
            loadProfilesForSidebar();
        }
        if (currentChannelId && sidebarLoaded && (!prevProps.currentChannelId || !prevProps.sidebarLoaded)) {
            queue.add(async () => this.prefetchPosts(currentChannelId));
            this.prefetchData();
        } else if (prevProps.prefetchQueueObj !== prefetchQueueObj) {
            clearTimeout(this.prefetchTimeout);
            await queue.clear();
            this.prefetchData();
        }
    }
    public prefetchPosts = (channelId: string) => {
        let delay;
        const channel = this.props.unreadChannels.find((unreadChannel) => channelId === unreadChannel.id);
        if (channel && (channel.type === Constants.PRIVATE_CHANNEL || channel.type === Constants.OPEN_CHANNEL)) {
            const isLatestPostInLastMin = (Date.now() - channel.last_post_at) <= 1000;
            if (isLatestPostInLastMin) {
                delay = Math.random() * 1000;
            }
        }
        return this.props.actions.prefetchChannelPosts(channelId, delay);
    };
    private prefetchData = () => {
        const {prefetchRequestStatus, prefetchQueueObj} = this.props;
        for (const priority in prefetchQueueObj) {
            if (!Object.hasOwn(prefetchQueueObj, priority)) {
                continue;
            }
            const priorityQueue = prefetchQueueObj[priority];
            for (const channelId of priorityQueue) {
                if (!Object.hasOwn(prefetchRequestStatus, channelId)) {
                    queue.add(async () => this.prefetchPosts(channelId));
                }
            }
        }
    };
    render() {
        return null;
    }
}