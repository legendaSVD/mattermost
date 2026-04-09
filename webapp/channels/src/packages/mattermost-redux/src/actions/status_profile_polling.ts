import type {PostList, Post, PostAcknowledgement, PostEmbed, PostPreviewMetadata} from '@mattermost/types/posts';
import type {UserProfile} from '@mattermost/types/users';
import {getGroupsByNames} from 'mattermost-redux/actions/groups';
import {getNeededAtMentionedUsernamesAndGroups} from 'mattermost-redux/actions/posts';
import {
    getProfilesByIds,
    getProfilesByUsernames,
    getStatusesByIds,
    maxUserIdsPerProfilesRequest,
    maxUserIdsPerStatusesRequest,
} from 'mattermost-redux/actions/users';
import {getCurrentUser, getCurrentUserId, getIsUserStatusesConfigEnabled, getUsers} from 'mattermost-redux/selectors/entities/common';
import {getLicense, getUsersStatusAndProfileFetchingPollInterval} from 'mattermost-redux/selectors/entities/general';
import {getUserStatuses} from 'mattermost-redux/selectors/entities/users';
import type {ActionFunc, ActionFuncAsync, ThunkActionFunc} from 'mattermost-redux/types/actions';
import {BackgroundDataLoader} from 'mattermost-redux/utils/data_loader';
export function addUserIdsForStatusFetchingPoll(userIdsForStatus: Array<UserProfile['id']>): ActionFunc<boolean> {
    return (dispatch, getState, {loaders}: any) => {
        if (!loaders.pollingStatusLoader) {
            loaders.pollingStatusLoader = new BackgroundDataLoader<UserProfile['id']>({
                fetchBatch: (userIds) => dispatch(getStatusesByIds(userIds)),
                maxBatchSize: maxUserIdsPerStatusesRequest,
            });
        }
        loaders.pollingStatusLoader.queue(userIdsForStatus);
        const pollingInterval = getUsersStatusAndProfileFetchingPollInterval(getState());
        if (!pollingInterval || pollingInterval <= 0) {
            loaders.pollingStatusLoader.fetchBatchNow();
        } else {
            loaders.pollingStatusLoader.startIntervalIfNeeded(pollingInterval);
        }
        return {data: true};
    };
}
export function addUserIdsForProfileFetchingPoll(userIdsForProfile: Array<UserProfile['id']>): ActionFunc<boolean> {
    return (dispatch, getState, {loaders}: any) => {
        if (!loaders.pollingProfileLoader) {
            loaders.pollingProfileLoader = new BackgroundDataLoader<UserProfile['id']>({
                fetchBatch: (userIds) => dispatch(getProfilesByIds(userIds)),
                maxBatchSize: maxUserIdsPerProfilesRequest,
            });
        }
        loaders.pollingProfileLoader.queue(userIdsForProfile);
        const pollingInterval = getUsersStatusAndProfileFetchingPollInterval(getState());
        if (!pollingInterval || pollingInterval <= 0) {
            loaders.pollingProfileLoader.fetchBatchNow();
        } else {
            loaders.pollingProfileLoader.startIntervalIfNeeded(pollingInterval);
        }
        return {data: true};
    };
}
export function cleanUpStatusAndProfileFetchingPoll(): ThunkActionFunc<void> {
    return (dispatch, getState, {loaders}: any) => {
        loaders.pollingStatusLoader?.stopInterval();
        loaders.pollingProfileLoader?.stopInterval();
    };
}
interface UserIdsAndMentions {
    userIdsForProfilePoll: Array<UserProfile['id']>;
    userIdsForStatusPoll: Array<UserProfile['id']>;
    mentionedUsernamesAndGroups: string[];
}
export function extractUserIdsAndMentionsFromPosts(posts: Post[]): ActionFunc<UserIdsAndMentions> {
    return (dispatch, getState) => {
        if (posts.length === 0) {
            return {data: {
                userIdsForProfilePoll: [],
                userIdsForStatusPoll: [],
                mentionedUsernamesAndGroups: [],
            }};
        }
        const userIdsForProfilePoll = new Set<UserProfile['id']>();
        const userIdsForStatusPoll = new Set<UserProfile['id']>();
        const mentionedUsernamesAndGroupsInPosts = new Set<string>();
        const state = getState();
        const currentUser = getCurrentUser(state);
        const currentUserId = getCurrentUserId(state);
        const isUserStatusesConfigEnabled = getIsUserStatusesConfigEnabled(state);
        const users = getUsers(state);
        const userStatuses = getUserStatuses(state);
        posts.forEach((post) => {
            if (post.metadata) {
                if (post.metadata.embeds) {
                    post.metadata.embeds.forEach((embed: PostEmbed) => {
                        if (embed.type === 'permalink' && embed.data) {
                            const permalinkPostPreviewMetaData = embed.data as PostPreviewMetadata;
                            if (permalinkPostPreviewMetaData.post?.user_id && !users[permalinkPostPreviewMetaData.post.user_id] && permalinkPostPreviewMetaData.post.user_id !== currentUserId) {
                                userIdsForProfilePoll.add(permalinkPostPreviewMetaData.post.user_id);
                            }
                            if (permalinkPostPreviewMetaData.post?.user_id && !userStatuses[permalinkPostPreviewMetaData.post.user_id] && permalinkPostPreviewMetaData.post.user_id !== currentUserId && isUserStatusesConfigEnabled) {
                                userIdsForStatusPoll.add(permalinkPostPreviewMetaData.post.user_id);
                            }
                        }
                    });
                }
                if (post.metadata.acknowledgements) {
                    post.metadata.acknowledgements.forEach((ack: PostAcknowledgement) => {
                        if (ack.acknowledged_at > 0 && ack.user_id && !users[ack.user_id] && ack.user_id !== currentUserId) {
                            userIdsForProfilePoll.add(ack.user_id);
                        }
                    });
                }
            }
            if (!users[post.user_id] && post.user_id !== currentUserId) {
                userIdsForProfilePoll.add(post.user_id);
            }
            if (!userStatuses[post.user_id] && post.user_id !== currentUserId && isUserStatusesConfigEnabled) {
                userIdsForStatusPoll.add(post.user_id);
            }
            const mentioned = getNeededAtMentionedUsernamesAndGroups(state, [post]);
            if (mentioned.size > 0) {
                mentioned.forEach((atMention) => {
                    if (atMention !== currentUser.username) {
                        mentionedUsernamesAndGroupsInPosts.add(atMention);
                    }
                });
            }
        });
        return {data: {
            userIdsForProfilePoll: Array.from(userIdsForProfilePoll),
            userIdsForStatusPoll: Array.from(userIdsForStatusPoll),
            mentionedUsernamesAndGroups: Array.from(mentionedUsernamesAndGroupsInPosts),
        }};
    };
}
export function batchFetchStatusesProfilesGroupsFromPosts(postsArrayOrMap: Post[]|PostList['posts']|Post): ActionFunc<boolean> {
    return (dispatch, getState) => {
        if (!postsArrayOrMap) {
            return {data: false};
        }
        let posts: Post[] = [];
        if (Array.isArray(postsArrayOrMap)) {
            posts = postsArrayOrMap;
        } else if (typeof postsArrayOrMap === 'object' && 'id' in postsArrayOrMap) {
            posts = [postsArrayOrMap as Post];
        } else if (typeof postsArrayOrMap === 'object') {
            posts = Object.values(postsArrayOrMap);
        }
        if (posts.length === 0) {
            return {data: false};
        }
        const state = getState();
        const {data: result} = dispatch(extractUserIdsAndMentionsFromPosts(posts));
        if (!result) {
            return {data: false};
        }
        if (result.userIdsForProfilePoll.length > 0) {
            dispatch(addUserIdsForProfileFetchingPoll(result.userIdsForProfilePoll));
        }
        if (result.userIdsForStatusPoll.length > 0) {
            dispatch(addUserIdsForStatusFetchingPoll(result.userIdsForStatusPoll));
        }
        if (result.mentionedUsernamesAndGroups.length > 0) {
            dispatch(getUsersFromMentionedUsernamesAndGroups(result.mentionedUsernamesAndGroups, getLicense(state).IsLicensed === 'true'));
        }
        return {data: true};
    };
}
export function getUsersFromMentionedUsernamesAndGroups(usernamesAndGroups: string[], isLicensed: boolean): ActionFuncAsync<string[]> {
    return async (dispatch) => {
        const {data: userProfiles} = await dispatch(getProfilesByUsernames(usernamesAndGroups));
        const mentionedUsernames: Array<UserProfile['username']> = [];
        if (userProfiles) {
            for (const user of userProfiles) {
                if (user && user.username) {
                    mentionedUsernames.push(user.username);
                }
            }
        }
        const mentionedGroups = usernamesAndGroups.filter((name) => !mentionedUsernames.includes(name));
        if (isLicensed && mentionedGroups.length > 0) {
            await dispatch(getGroupsByNames(mentionedGroups));
        }
        return {data: mentionedGroups};
    };
}