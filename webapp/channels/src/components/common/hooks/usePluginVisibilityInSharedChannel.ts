import {useSelector} from 'react-redux';
import {getChannel} from 'mattermost-redux/selectors/entities/channels';
import {getFeatureFlagValue} from 'mattermost-redux/selectors/entities/general';
import type {GlobalState} from 'types/store';
export function usePluginVisibilityInSharedChannel(channelId: string | undefined): boolean {
    const channel = useSelector((state: GlobalState) =>
        (channelId ? getChannel(state, channelId) : undefined),
    );
    const sharedChannelsPluginsEnabled = useSelector((state: GlobalState) =>
        getFeatureFlagValue(state, 'EnableSharedChannelsPlugins') === 'true',
    );
    if (!channelId || !channel) {
        return true;
    }
    return !channel.shared || sharedChannelsPluginsEnabled;
}