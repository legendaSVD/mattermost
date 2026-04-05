import type {Post} from '@mattermost/types/posts';
import {PostTypes} from 'mattermost-redux/action_types';
import {logError} from 'mattermost-redux/actions/errors';
import {forceLogoutIfNecessary} from 'mattermost-redux/actions/helpers';
import {Client4} from 'mattermost-redux/client';
import type {ActionFuncAsync} from 'types/store';
export function revealBurnOnReadPost(postId: string): ActionFuncAsync<Post> {
    return async (dispatch, getState) => {
        let revealedPost: Post;
        try {
            revealedPost = await Client4.revealBurnOnReadPost(postId);
        } catch (error) {
            forceLogoutIfNecessary(error, dispatch, getState);
            dispatch(logError(error));
            return {error};
        }
        const expireAt = revealedPost.metadata?.expire_at;
        dispatch({
            type: PostTypes.REVEAL_BURN_ON_READ_SUCCESS,
            data: {
                post: revealedPost,
                expireAt: expireAt || 0,
            },
        });
        return {data: revealedPost};
    };
}