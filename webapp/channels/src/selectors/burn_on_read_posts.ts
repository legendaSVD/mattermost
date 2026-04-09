import type {Post} from '@mattermost/types/posts';
import {getCurrentUserId} from 'mattermost-redux/selectors/entities/common';
import {getPost} from 'mattermost-redux/selectors/entities/posts';
import {PostTypes} from 'utils/constants';
import type {GlobalState} from 'types/store';
export function isBurnOnReadPost(state: GlobalState, postId: string): boolean {
    const post = getPost(state, postId);
    return isThisPostBurnOnReadPost(post);
}
export function isThisPostBurnOnReadPost(post?: Post): boolean {
    return post?.type === PostTypes.BURN_ON_READ;
}
export function hasUserRevealedBurnOnReadPost(state: GlobalState, postId: string): boolean {
    const post = getPost(state, postId);
    const currentUserId = getCurrentUserId(state);
    if (!post || post.type !== PostTypes.BURN_ON_READ) {
        return false;
    }
    if (post.user_id === currentUserId) {
        return true;
    }
    return typeof post.metadata?.expire_at === 'number';
}
export function shouldDisplayConcealedPlaceholder(state: GlobalState, postId: string): boolean {
    const post = getPost(state, postId);
    const currentUserId = getCurrentUserId(state);
    if (!post || post.type !== PostTypes.BURN_ON_READ) {
        return false;
    }
    if (post.user_id === currentUserId) {
        return false;
    }
    return typeof post.metadata?.expire_at !== 'number';
}
export function getBurnOnReadPost(state: GlobalState, postId: string): Post | null {
    const post = getPost(state, postId);
    if (!post || post.type !== PostTypes.BURN_ON_READ) {
        return null;
    }
    return post;
}
export function getBurnOnReadPostExpiration(state: GlobalState, postId: string): number | null {
    const post = getPost(state, postId);
    if (!post || post.type !== PostTypes.BURN_ON_READ) {
        return null;
    }
    const expireAt = post.metadata?.expire_at;
    if (typeof expireAt === 'number') {
        return expireAt;
    }
    return null;
}
export function isCurrentUserBurnOnReadSender(state: GlobalState, postId: string): boolean {
    const post = getPost(state, postId);
    const currentUserId = getCurrentUserId(state);
    if (!post || post.type !== PostTypes.BURN_ON_READ) {
        return false;
    }
    return post.user_id === currentUserId;
}