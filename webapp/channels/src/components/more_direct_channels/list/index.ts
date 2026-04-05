import {connect} from 'react-redux';
import type {UserProfile} from '@mattermost/types/users';
import {createSelector} from 'mattermost-redux/selectors/create_selector';
import {getAllChannels, getChannelsWithUserProfiles} from 'mattermost-redux/selectors/entities/channels';
import {getCurrentUserId} from 'mattermost-redux/selectors/entities/users';
import {getUserIdFromChannelName} from 'mattermost-redux/utils/channel_utils';
import {filterProfilesStartingWithTerm} from 'mattermost-redux/utils/user_utils';
import Constants from 'utils/constants';
import type {GlobalState} from 'types/store';
import List from './list';
import type {Option, OptionValue} from '../types';
type OwnProps = {
    users: UserProfile[];
    values: OptionValue[];
}
export function makeGetOptions(): (state: GlobalState, users: UserProfile[], values: OptionValue[]) => Option[] {
    const getUsersWithDMs = createSelector(
        'getUsersWithDMs',
        getCurrentUserId,
        getAllChannels,
        (state: GlobalState, users: UserProfile[]) => users,
        (currentUserId, allChannels, users) => {
            const directChannels = Object.values(allChannels).filter((channel) => channel.type === Constants.DM_CHANNEL);
            const usersWithDMs: Array<UserProfile & {last_post_at: number}> = [];
            for (const channel of directChannels) {
                const otherUserId = getUserIdFromChannelName(currentUserId, channel.name);
                const otherUser = users.find((user) => user.id === otherUserId);
                if (!otherUser) {
                    continue;
                }
                if (channel.last_post_at === 0) {
                    continue;
                }
                usersWithDMs.push({
                    ...otherUser,
                    last_post_at: channel.last_post_at,
                });
            }
            return usersWithDMs;
        },
    );
    const getFilteredGroupChannels = createSelector(
        'getFilteredGroupChannels',
        getChannelsWithUserProfiles,
        (state: GlobalState) => state.views.search.modalSearch,
        (state: GlobalState, values: OptionValue[]) => values,
        (channelsWithProfiles, searchTerm, values) => {
            return channelsWithProfiles.filter((channel) => {
                if (searchTerm) {
                    const matches = filterProfilesStartingWithTerm(channel.profiles, searchTerm);
                    if (matches.length === 0) {
                        return false;
                    }
                }
                if (values) {
                    const valuesInProfiles = values.every((value) => channel.profiles.find((user) => user.id === value.id));
                    if (!valuesInProfiles) {
                        return false;
                    }
                }
                return channel.last_post_at > 0;
            });
        },
    );
    return createSelector(
        'makeGetOptions',
        getUsersWithDMs,
        (state: GlobalState, users: UserProfile[], values: OptionValue[]) => getFilteredGroupChannels(state, values),
        (state: GlobalState, users: UserProfile[]) => users,
        (state: GlobalState) => Boolean(state.views.search.modalSearch),
        (usersWithDMs, filteredGroupChannels, users, isSearch) => {
            const recents = [...usersWithDMs, ...filteredGroupChannels].
                sort((a, b) => b.last_post_at - a.last_post_at);
            if (!isSearch && recents.length > 0) {
                return recents.slice(0, 20);
            }
            const usersWithoutDMs = users.
                filter((user) => user.delete_at === 0 && !usersWithDMs.some((other) => other.id === user.id)).
                map((user) => ({...user, last_post_at: 0}));
            usersWithoutDMs.sort((a, b) => {
                return a.username.localeCompare(b.username);
            });
            return [
                ...recents,
                ...usersWithoutDMs,
            ];
        },
    );
}
function makeMapStateToProps() {
    const getOptions = makeGetOptions();
    return (state: GlobalState, ownProps: OwnProps) => {
        return {
            options: getOptions(state, ownProps.users, ownProps.values),
        };
    };
}
export default connect(makeMapStateToProps)(List);