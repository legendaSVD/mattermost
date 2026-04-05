import type {WebSocketMessages} from '@mattermost/client';
import {PostTypes} from 'mattermost-redux/action_types';
import {getCurrentUserId} from 'mattermost-redux/selectors/entities/users';
import type {DispatchFunc, GetStateFunc} from 'types/store';
export function handleBurnOnReadPostRevealed(data: WebSocketMessages.BurnOnReadPostRevealed['data']) {
    return async (dispatch: DispatchFunc, getState: GetStateFunc) => {
        const state = getState();
        const currentUserId = getCurrentUserId(state);
        let post;
        if (typeof data.post === 'string') {
            try {
                post = JSON.parse(data.post);
            } catch (e) {
                console.error('Failed to parse burn-on-read post revealed data:', e);
                return {data: false};
            }
        } else {
            post = data.post;
        }
        if (!post || !post.id) {
            return {data: false};
        }
        const existingPost = state.entities.posts.posts[post.id];
        if (!existingPost) {
            return {data: false};
        }
        if (existingPost.user_id === currentUserId && data.recipients) {
            dispatch({
                type: PostTypes.POST_RECIPIENTS_UPDATED,
                data: {
                    postId: post.id,
                    recipients: data.recipients,
                },
            });
        }
        if (existingPost.user_id !== currentUserId && post.message) {
            const expireAt = post.metadata?.expire_at || 0;
            dispatch({
                type: PostTypes.REVEAL_BURN_ON_READ_SUCCESS,
                data: {
                    post,
                    expireAt,
                },
            });
        }
        return {data: true};
    };
}
export function handleBurnOnReadAllRevealed(data: WebSocketMessages.BurnOnReadPostAllRevealed['data']) {
    return async (dispatch: DispatchFunc, getState: GetStateFunc) => {
        const state = getState();
        const {post_id: postId, sender_expire_at: senderExpireAt} = data;
        if (!postId || !senderExpireAt) {
            return {data: false};
        }
        const post = state.entities.posts.posts[postId];
        if (!post) {
            return {data: false};
        }
        dispatch({
            type: PostTypes.BURN_ON_READ_ALL_REVEALED,
            data: {
                postId,
                senderExpireAt,
            },
        });
        return {data: true};
    };
}