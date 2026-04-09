import type {
    OpenGraphMetadata,
    Post,
    PostsState,
    PostOrderBlock,
    MessageHistory,
    PostAcknowledgement,
    PostEmbed,
    PostPreviewMetadata,
} from '@mattermost/types/posts';
import type {Reaction} from '@mattermost/types/reactions';
import type {UserProfile} from '@mattermost/types/users';
import type {
    RelationOneToOne,
    IDMappedObjects,
    RelationOneToMany,
} from '@mattermost/types/utilities';
import type {MMReduxAction} from 'mattermost-redux/action_types';
import {ChannelTypes, PostTypes, UserTypes, ThreadTypes, CloudTypes, LimitsTypes, TeamTypes} from 'mattermost-redux/action_types';
import {Posts} from 'mattermost-redux/constants';
import {PostTypes as PostTypeConstants} from 'mattermost-redux/constants/posts';
import {comparePosts, isPermalink, shouldUpdatePost} from 'mattermost-redux/utils/post_utils';
export function removeUnneededMetadata(post: Post) {
    if (!post.metadata) {
        return post;
    }
    const metadata = {...post.metadata};
    let changed = false;
    if (metadata.emojis) {
        Reflect.deleteProperty(metadata, 'emojis');
        changed = true;
    }
    if (metadata.files) {
        Reflect.deleteProperty(metadata, 'files');
        changed = true;
    }
    if (metadata.reactions) {
        Reflect.deleteProperty(metadata, 'reactions');
        changed = true;
    }
    if (metadata.reactions) {
        Reflect.deleteProperty(metadata, 'acknowledgements');
        changed = true;
    }
    if (metadata.embeds) {
        let embedsChanged = false;
        const newEmbeds = metadata.embeds.map((embed) => {
            switch (embed.type) {
            case 'opengraph': {
                const newEmbed = {...embed};
                Reflect.deleteProperty(newEmbed, 'data');
                embedsChanged = true;
                return newEmbed;
            }
            case 'permalink': {
                const permalinkEmbed = {...embed};
                if (permalinkEmbed.data) {
                    Reflect.deleteProperty(permalinkEmbed.data, 'post');
                }
                embedsChanged = true;
                return permalinkEmbed;
            }
            default:
                return embed;
            }
        });
        if (embedsChanged) {
            metadata.embeds = newEmbeds;
            changed = true;
        }
    }
    if (!changed) {
        return post;
    }
    return {
        ...post,
        metadata,
    };
}
export function nextPostsReplies(state: {[x in Post['id']]: number} = {}, action: MMReduxAction) {
    switch (action.type) {
    case PostTypes.RECEIVED_POST:
    case PostTypes.RECEIVED_NEW_POST: {
        const post = action.data;
        if (!post.id || !post.root_id || !post.reply_count) {
            return state;
        }
        const newState = {...state};
        newState[post.root_id] = post.reply_count;
        return newState;
    }
    case PostTypes.RECEIVED_POSTS: {
        const posts = Object.values(action.data.posts) as Post[];
        if (posts.length === 0) {
            return state;
        }
        const nextState = {...state};
        for (const post of posts) {
            if (post.root_id) {
                nextState[post.root_id] = post.reply_count;
            } else {
                nextState[post.id] = post.reply_count;
            }
        }
        return nextState;
    }
    case PostTypes.POST_DELETED: {
        const post: Post = action.data;
        if (!state[post.root_id] && !state[post.id]) {
            return state;
        }
        const nextState = {...state};
        if (post.root_id && state[post.root_id]) {
            nextState[post.root_id] -= 1;
        }
        if (!post.root_id && state[post.id]) {
            Reflect.deleteProperty(nextState, post.id);
        }
        return nextState;
    }
    case UserTypes.LOGOUT_SUCCESS:
        return {};
    default:
        return state;
    }
}
function removePostsAndEmbedsForChannels(state: IDMappedObjects<Post>, channelIds: Set<string>): IDMappedObjects<Post> {
    let postModified = false;
    const nextState = {...state};
    for (const post of Object.values(state)) {
        if (channelIds.has(post.channel_id)) {
            Reflect.deleteProperty(nextState, post.id);
            postModified = true;
            continue;
        }
        if (post.metadata?.embeds?.length) {
            const newEmbeds: PostEmbed[] = [];
            let embedRemoved = false;
            for (const embed of post.metadata.embeds) {
                if (embed.type === 'permalink' && embed.data && channelIds.has((embed.data as PostPreviewMetadata).channel_id)) {
                    embedRemoved = true;
                } else {
                    newEmbeds.push(embed);
                }
            }
            if (embedRemoved) {
                nextState[post.id] = {
                    ...nextState[post.id],
                    metadata: {
                        ...nextState[post.id].metadata,
                        embeds: newEmbeds,
                    },
                };
                postModified = true;
            }
        }
    }
    if (!postModified) {
        return state;
    }
    return nextState;
}
export function handlePosts(state: IDMappedObjects<Post> = {}, action: MMReduxAction) {
    switch (action.type) {
    case PostTypes.RECEIVED_POST:
    case PostTypes.RECEIVED_NEW_POST: {
        return handlePostReceived({...state}, action.data);
    }
    case PostTypes.RECEIVED_POSTS: {
        const posts = Object.values(action.data.posts) as Post[];
        if (posts.length === 0) {
            return state;
        }
        const nextState = {...state};
        for (const post of posts) {
            handlePostReceived(nextState, post);
        }
        return nextState;
    }
    case PostTypes.POST_DELETED: {
        const post: Post = action.data;
        if (!state[post.id]) {
            return state;
        }
        if (state[post.id].type === PostTypeConstants.BURN_ON_READ) {
            const nextState = {...state};
            Reflect.deleteProperty(nextState, post.id);
            return nextState;
        }
        const nextState = {
            ...state,
            [post.id]: {
                ...state[post.id],
                state: Posts.POST_DELETED,
                message: '',
                file_ids: [],
                has_reactions: false,
            },
        };
        for (const otherPost of Object.values(state)) {
            if (otherPost.root_id === post.id) {
                Reflect.deleteProperty(nextState, otherPost.id);
            }
            if (otherPost.metadata && otherPost.metadata.embeds && otherPost.metadata.embeds.length > 0) {
                const newEmbeds: PostEmbed[] = [];
                for (const embed of otherPost.metadata.embeds) {
                    if (embed.type === 'permalink' && embed.data && (embed.data as PostPreviewMetadata).post_id === post.id) {
                        continue;
                    }
                    newEmbeds.push(embed);
                }
                if (newEmbeds.length !== otherPost.metadata.embeds.length) {
                    nextState[otherPost.id] = {
                        ...nextState[otherPost.id],
                        metadata: {
                            ...nextState[otherPost.id].metadata,
                            embeds: newEmbeds,
                        },
                    };
                }
            }
        }
        return nextState;
    }
    case PostTypes.POST_REMOVED: {
        const post = action.data;
        if (!state[post.id]) {
            return state;
        }
        const nextState = {...state};
        Reflect.deleteProperty(nextState, post.id);
        for (const otherPost of Object.values(state)) {
            if (otherPost.root_id === post.id) {
                Reflect.deleteProperty(nextState, otherPost.id);
            }
        }
        return nextState;
    }
    case PostTypes.POST_PINNED_CHANGED: {
        const {postId, isPinned, updateAt} = action;
        if (!state[postId]) {
            return state;
        }
        return {
            ...state,
            [postId]: {
                ...state[postId],
                is_pinned: isPinned,
                last_update_at: updateAt,
            },
        };
    }
    case PostTypes.REVEAL_BURN_ON_READ_SUCCESS: {
        const {post, expireAt} = action.data;
        if (!state[post.id]) {
            return state;
        }
        const currentPost = state[post.id];
        const currentMetadata = currentPost.metadata || {};
        const newMetadata = post.metadata || {};
        return {
            ...state,
            [post.id]: {
                ...currentPost,
                ...post,
                metadata: {
                    ...currentMetadata,
                    ...newMetadata,
                    expire_at: expireAt,
                },
            },
        };
    }
    case PostTypes.POST_RECIPIENTS_UPDATED: {
        const {postId, recipients} = action.data;
        if (!state[postId]) {
            return state;
        }
        const currentPost = state[postId];
        const currentMetadata = currentPost.metadata || {};
        const currentRecipients = currentMetadata.recipients || [];
        const mergedRecipients = [...new Set([...currentRecipients, ...recipients])];
        return {
            ...state,
            [postId]: {
                ...currentPost,
                metadata: {
                    ...currentMetadata,
                    recipients: mergedRecipients,
                },
            },
        };
    }
    case PostTypes.BURN_ON_READ_ALL_REVEALED: {
        const {postId, senderExpireAt} = action.data;
        if (!state[postId]) {
            return state;
        }
        const currentPost = state[postId];
        const currentMetadata = currentPost.metadata || {};
        return {
            ...state,
            [postId]: {
                ...currentPost,
                metadata: {
                    ...currentMetadata,
                    expire_at: senderExpireAt,
                },
            },
        };
    }
    case ChannelTypes.LEAVE_CHANNEL: {
        const channelId = action.data.id;
        return removePostsAndEmbedsForChannels(state, new Set([channelId]));
    }
    case TeamTypes.LEAVE_TEAM: {
        const channelIds: string[] = action.data.channelIds || [];
        if (channelIds.length === 0) {
            return state;
        }
        return removePostsAndEmbedsForChannels(state, new Set(channelIds));
    }
    case ThreadTypes.FOLLOW_CHANGED_THREAD: {
        const {id, following} = action.data;
        const post = state[id];
        return {
            ...state,
            [id]: {
                ...post,
                is_following: following,
            },
        };
    }
    case PostTypes.POST_TRANSLATION_UPDATED: {
        const data: {
            object_id: string;
            language: string;
            state: 'ready' | 'skipped' | 'processing' | 'unavailable';
            translation?: string;
            src_lang?: string;
        } = action.data;
        if (!state[data.object_id]) {
            return state;
        }
        const existingTranslations = state[data.object_id].metadata?.translations || {};
        const newTranslations = {
            ...existingTranslations,
            [data.language]: {
                object: data.translation ? JSON.parse(data.translation) : undefined,
                state: data.state,
                source_lang: data.src_lang,
            },
        };
        return {
            ...state,
            [data.object_id]: {
                ...state[data.object_id],
                metadata: {
                    ...state[data.object_id].metadata,
                    translations: newTranslations,
                },
            },
        };
    }
    case UserTypes.LOGOUT_SUCCESS:
        return {};
    default:
        return state;
    }
}
function handlePostReceived(nextState: any, post: Post, nestedPermalinkLevel?: number) {
    let currentState = nextState;
    if (!shouldUpdatePost(post, currentState[post.id]) || (nestedPermalinkLevel && nestedPermalinkLevel > 1)) {
        return currentState;
    }
    if (!nestedPermalinkLevel && isPermalink(post) && currentState[post.id] && !currentState[post.id].metadata && post.metadata) {
        currentState[post.id] = {...currentState[post.id], ...post.metadata};
    }
    if (post.update_at > 0 && currentState[post.id]) {
        if (post.is_following == null) {
            post.is_following = currentState[post.id].is_following;
        }
        if (post.participants == null && currentState[post.id].participants) {
            post.participants = currentState[post.id].participants;
        }
        if (!post.last_reply_at && currentState[post.id].last_reply_at) {
            post.last_reply_at = currentState[post.id].last_reply_at;
        }
    }
    if (post.delete_at > 0) {
        if (currentState[post.id]) {
            currentState[post.id] = {
                ...removeUnneededMetadata(post),
                state: Posts.POST_DELETED,
                file_ids: [],
                has_reactions: false,
            };
        }
    } else if (post.metadata && post.metadata.embeds) {
        post.metadata.embeds.forEach((embed) => {
            if (embed.type === 'permalink') {
                if (embed.data && 'post_id' in embed.data && embed.data.post) {
                    currentState = handlePostReceived(currentState, embed.data.post, nestedPermalinkLevel ? nestedPermalinkLevel + 1 : 1);
                    if (isPermalink(embed.data.post)) {
                        currentState[post.id] = removeUnneededMetadata(post);
                    }
                }
            }
        });
        currentState[post.id] = post;
    } else {
        currentState[post.id] = removeUnneededMetadata(post);
    }
    if (post.pending_post_id && post.id !== post.pending_post_id && currentState[post.pending_post_id]) {
        Reflect.deleteProperty(currentState, post.pending_post_id);
    }
    const rootPost: Post = currentState[post.root_id];
    if (post.root_id && rootPost) {
        const participants = rootPost.participants || [];
        const nextRootPost = {...rootPost};
        if (!participants.find((user: UserProfile) => user.id === post.user_id)) {
            nextRootPost.participants = [...participants, {id: post.user_id}];
        }
        if (post.reply_count) {
            nextRootPost.reply_count = post.reply_count;
        }
        currentState[post.root_id] = nextRootPost;
    }
    return currentState;
}
export function handlePendingPosts(state: string[] = [], action: MMReduxAction) {
    switch (action.type) {
    case PostTypes.RECEIVED_NEW_POST: {
        const post = action.data;
        if (!post.pending_post_id) {
            return state;
        }
        const index = state.indexOf(post.pending_post_id);
        if (index !== -1) {
            return state;
        }
        const nextState = [...state];
        nextState.push(post.pending_post_id);
        return nextState;
    }
    case PostTypes.POST_REMOVED: {
        const post = action.data;
        const index = state.indexOf(post.id);
        if (index === -1) {
            return state;
        }
        const nextState = [...state];
        nextState.splice(index, 1);
        return nextState;
    }
    case PostTypes.RECEIVED_POST: {
        const post = action.data;
        if (!post.pending_post_id) {
            return state;
        }
        const index = state.indexOf(post.pending_post_id);
        if (index === -1) {
            return state;
        }
        const nextState = [...state];
        nextState.splice(index, 1);
        return nextState;
    }
    default:
        return state;
    }
}
export function postsInChannel(state: Record<string, PostOrderBlock[]> = {}, action: MMReduxAction, prevPosts: IDMappedObjects<Post>, nextPosts: Record<string, Post>) {
    switch (action.type) {
    case PostTypes.RESET_POSTS_IN_CHANNEL: {
        const {channelId} = action;
        if (!channelId) {
            return {};
        }
        const nextState = {...state};
        Reflect.deleteProperty(nextState, channelId);
        return nextState;
    }
    case PostTypes.RECEIVED_NEW_POST: {
        const post = action.data as Post;
        if (action.features?.crtEnabled && post.root_id) {
            return state;
        }
        const postsForChannel = state[post.channel_id];
        if (!postsForChannel) {
            return state;
        }
        const recentBlockIndex = postsForChannel.findIndex((block: PostOrderBlock) => block.recent);
        let nextRecentBlock: PostOrderBlock;
        if (recentBlockIndex === -1) {
            nextRecentBlock = {
                order: [],
                recent: true,
            };
        } else {
            const recentBlock = postsForChannel[recentBlockIndex];
            nextRecentBlock = {
                ...recentBlock,
                order: [...recentBlock.order],
            };
        }
        let changed = false;
        if (!nextRecentBlock.order.includes(post.id)) {
            nextRecentBlock.order.unshift(post.id);
            changed = true;
        }
        if (post.pending_post_id && post.id !== post.pending_post_id) {
            const index = nextRecentBlock.order.indexOf(post.pending_post_id);
            if (index !== -1) {
                nextRecentBlock.order.splice(index, 1);
                nextRecentBlock.order.sort((a, b) => {
                    return comparePosts(nextPosts[a], nextPosts[b]);
                });
                changed = true;
            }
        }
        if (!changed) {
            return state;
        }
        const nextPostsForChannel = [...postsForChannel];
        if (recentBlockIndex === -1) {
            nextPostsForChannel.push(nextRecentBlock);
        } else {
            nextPostsForChannel[recentBlockIndex] = nextRecentBlock;
        }
        return {
            ...state,
            [post.channel_id]: nextPostsForChannel,
        };
    }
    case PostTypes.RECEIVED_POST: {
        const post = action.data;
        if (action.features?.crtEnabled && post.root_id) {
            return state;
        }
        if (!post.pending_post_id) {
            return state;
        }
        const postsForChannel = state[post.channel_id] || [];
        const recentBlockIndex = postsForChannel.findIndex((block: PostOrderBlock) => block.recent);
        if (recentBlockIndex === -1) {
            return state;
        }
        const recentBlock = postsForChannel[recentBlockIndex];
        const index = recentBlock.order.indexOf(post.pending_post_id);
        if (index === -1) {
            return state;
        }
        const nextRecentBlock = {
            ...recentBlock,
            order: [...recentBlock.order],
        };
        nextRecentBlock.order[index] = post.id;
        const nextPostsForChannel = [...postsForChannel];
        nextPostsForChannel[recentBlockIndex] = nextRecentBlock;
        return {
            ...state,
            [post.channel_id]: nextPostsForChannel,
        };
    }
    case PostTypes.RECEIVED_POSTS_IN_CHANNEL: {
        const {recent, oldest} = action;
        const order = action.data.order;
        if (order.length === 0 && state[action.channelId]) {
            return state;
        }
        const postsForChannel = state[action.channelId] || [];
        let nextPostsForChannel = [...postsForChannel];
        if (recent) {
            const recentBlockIndex = postsForChannel.findIndex((block: PostOrderBlock) => block.recent);
            if (recentBlockIndex !== -1) {
                const recentBlock = postsForChannel[recentBlockIndex];
                if (recentBlock.order.length === order.length &&
                        recentBlock.order[0] === order[0] &&
                        recentBlock.order[recentBlock.order.length - 1] === order[order.length - 1]) {
                    return state;
                }
                const nextRecentBlock = {
                    ...recentBlock,
                    recent: false,
                };
                nextPostsForChannel[recentBlockIndex] = nextRecentBlock;
            }
        }
        nextPostsForChannel.push({
            order,
            recent,
            oldest,
        });
        nextPostsForChannel = mergePostBlocks(nextPostsForChannel, nextPosts);
        return {
            ...state,
            [action.channelId]: nextPostsForChannel,
        };
    }
    case PostTypes.RECEIVED_POSTS_AFTER: {
        const order = action.data.order;
        const afterPostId = action.afterPostId;
        if (order.length === 0) {
            return state;
        }
        const postsForChannel = state[action.channelId] || [];
        const newBlock = {
            order: [...order, afterPostId],
            recent: action.recent,
        };
        let nextPostsForChannel = [...postsForChannel, newBlock];
        nextPostsForChannel = mergePostBlocks(nextPostsForChannel, nextPosts);
        return {
            ...state,
            [action.channelId]: nextPostsForChannel,
        };
    }
    case PostTypes.RECEIVED_POSTS_BEFORE: {
        const {order} = action.data;
        const {beforePostId, oldest} = action;
        if (order.length === 0) {
            return state;
        }
        const postsForChannel = state[action.channelId] || [];
        const newBlock = {
            order: [beforePostId, ...order],
            recent: false,
            oldest,
        };
        let nextPostsForChannel = [...postsForChannel, newBlock];
        nextPostsForChannel = mergePostBlocks(nextPostsForChannel, nextPosts);
        return {
            ...state,
            [action.channelId]: nextPostsForChannel,
        };
    }
    case PostTypes.RECEIVED_POSTS_SINCE: {
        const order = action.data.order;
        if (order.length === 0 && state[action.channelId]) {
            return state;
        }
        const postsForChannel = state[action.channelId] || [];
        const recentBlockIndex = postsForChannel.findIndex((block: PostOrderBlock) => block.recent);
        if (recentBlockIndex === -1) {
            return state;
        }
        const recentBlock = postsForChannel[recentBlockIndex];
        const mostOldestCreateAt = nextPosts[recentBlock.order[recentBlock.order.length - 1]].create_at;
        const nextRecentBlock: PostOrderBlock = {
            ...recentBlock,
            order: [...recentBlock.order],
        };
        for (let i = order.length - 1; i >= 0; i--) {
            const postId = order[i];
            if (!nextPosts[postId]) {
                continue;
            }
            if (nextPosts[postId].create_at <= mostOldestCreateAt) {
                continue;
            }
            if (nextRecentBlock.order.indexOf(postId) !== -1) {
                continue;
            }
            nextRecentBlock.order.unshift(postId);
        }
        if (nextRecentBlock.order.length === recentBlock.order.length) {
            return state;
        }
        nextRecentBlock.order.sort((a, b) => {
            return comparePosts(nextPosts[a], nextPosts[b]);
        });
        const nextPostsForChannel = [...postsForChannel];
        nextPostsForChannel[recentBlockIndex] = nextRecentBlock;
        return {
            ...state,
            [action.channelId]: nextPostsForChannel,
        };
    }
    case PostTypes.POST_DELETED: {
        const post = action.data;
        const postsForChannel = state[post.channel_id] || [];
        if (postsForChannel.length === 0) {
            return state;
        }
        let changed = false;
        let nextPostsForChannel = [...postsForChannel];
        const isBoRPost = prevPosts[post.id]?.type === PostTypeConstants.BURN_ON_READ;
        const shouldRemovePost = (postId: string) => {
            const isTheDeletedPost = postId === post.id;
            const isReplyToDeletedPost = prevPosts[postId]?.root_id === post.id;
            if (isBoRPost) {
                return isTheDeletedPost;
            }
            return isReplyToDeletedPost;
        };
        for (let i = 0; i < nextPostsForChannel.length; i++) {
            const block = nextPostsForChannel[i];
            const nextOrder = block.order.filter((postId) => !shouldRemovePost(postId));
            if (nextOrder.length !== block.order.length) {
                nextPostsForChannel[i] = {
                    ...block,
                    order: nextOrder,
                };
                changed = true;
            }
        }
        if (!changed) {
            return state;
        }
        nextPostsForChannel = removeNonRecentEmptyPostBlocks(nextPostsForChannel);
        return {
            ...state,
            [post.channel_id]: nextPostsForChannel,
        };
    }
    case PostTypes.POST_REMOVED: {
        const post = action.data;
        const postsForChannel = state[post.channel_id] || [];
        if (postsForChannel.length === 0) {
            return state;
        }
        let changed = false;
        const isBoRPost = prevPosts[post.id]?.type === PostTypeConstants.BURN_ON_READ;
        let nextPostsForChannel = [...postsForChannel];
        for (let i = 0; i < nextPostsForChannel.length; i++) {
            const block = nextPostsForChannel[i];
            const nextOrder = isBoRPost ? block.order.filter((postId: string) => postId !== post.id) : block.order.filter((postId: string) => postId !== post.id && prevPosts[postId]?.root_id !== post.id);
            if (nextOrder.length !== block.order.length) {
                nextPostsForChannel[i] = {
                    ...block,
                    order: nextOrder,
                };
                changed = true;
            }
        }
        if (!changed) {
            return state;
        }
        nextPostsForChannel = removeNonRecentEmptyPostBlocks(nextPostsForChannel);
        return {
            ...state,
            [post.channel_id]: nextPostsForChannel,
        };
    }
    case ChannelTypes.LEAVE_CHANNEL: {
        const channelId = action.data.id;
        if (!state[channelId]) {
            return state;
        }
        const nextState = {...state};
        Reflect.deleteProperty(nextState, channelId);
        return nextState;
    }
    case UserTypes.LOGOUT_SUCCESS:
        return {};
    default:
        return state;
    }
}
export function removeNonRecentEmptyPostBlocks(blocks: PostOrderBlock[]) {
    return blocks.filter((block: PostOrderBlock) => block.order.length !== 0 || block.recent);
}
export function mergePostBlocks(blocks: PostOrderBlock[], posts: Record<string, Post>) {
    let nextBlocks = [...blocks];
    nextBlocks = removeNonRecentEmptyPostBlocks(blocks);
    if (!nextBlocks.length) {
        return blocks;
    }
    nextBlocks.sort((a, b) => {
        const aStartsAt = posts[a.order[0]].create_at;
        const bStartsAt = posts[b.order[0]].create_at;
        return bStartsAt - aStartsAt;
    });
    let i = 0;
    while (i < nextBlocks.length - 1) {
        const a = nextBlocks[i];
        const aEndsAt = posts[a.order[a.order.length - 1]].create_at;
        const b = nextBlocks[i + 1];
        const bStartsAt = posts[b.order[0]].create_at;
        if (aEndsAt <= bStartsAt) {
            nextBlocks[i] = {
                order: mergePostOrder(a.order, b.order, posts),
            };
            nextBlocks[i].recent = a.recent || b.recent;
            nextBlocks[i].oldest = a.oldest || b.oldest;
            nextBlocks.splice(i + 1, 1);
        } else {
            i += 1;
        }
    }
    if (blocks.length === nextBlocks.length) {
        return blocks;
    }
    return nextBlocks;
}
export function mergePostOrder(left: string[], right: string[], posts: Record<string, Post>) {
    const result = [...left];
    const seen = new Set(left);
    for (const id of right) {
        if (seen.has(id)) {
            continue;
        }
        result.push(id);
    }
    if (result.length === left.length) {
        return left;
    }
    result.sort((a, b) => posts[b].create_at - posts[a].create_at);
    return result;
}
export function postsInThread(state: RelationOneToMany<Post, Post> = {}, action: MMReduxAction, prevPosts: Record<string, Post>) {
    switch (action.type) {
    case PostTypes.RECEIVED_NEW_POST:
    case PostTypes.RECEIVED_POST: {
        const post = action.data;
        if (!post.root_id) {
            return state;
        }
        const postsForThread = state[post.root_id] || [];
        const nextPostsForThread = [...postsForThread];
        let changed = false;
        if (!postsForThread.includes(post.id)) {
            nextPostsForThread.push(post.id);
            changed = true;
        }
        if (post.pending_post_id && post.id !== post.pending_post_id) {
            const index = nextPostsForThread.indexOf(post.pending_post_id);
            if (index !== -1) {
                nextPostsForThread.splice(index, 1);
                changed = true;
            }
        }
        if (!changed) {
            return state;
        }
        return {
            ...state,
            [post.root_id]: nextPostsForThread,
        };
    }
    case PostTypes.RECEIVED_POSTS_AFTER:
    case PostTypes.RECEIVED_POSTS_BEFORE:
    case PostTypes.RECEIVED_POSTS_IN_CHANNEL:
    case PostTypes.RECEIVED_POSTS_SINCE: {
        const newPosts: Post[] = Object.values(action.data.posts);
        if (newPosts.length === 0) {
            return state;
        }
        const nextState: Record<string, string[]> = {};
        for (const post of newPosts) {
            if (!post.root_id) {
                continue;
            }
            const postsForThread = state[post.root_id] || [];
            const nextPostsForThread = nextState[post.root_id] || [...postsForThread];
            if (!nextPostsForThread.includes(post.id)) {
                nextPostsForThread.push(post.id);
            }
            nextState[post.root_id] = nextPostsForThread;
        }
        if (Object.keys(nextState).length === 0) {
            return state;
        }
        return {
            ...state,
            ...nextState,
        };
    }
    case PostTypes.RECEIVED_POSTS_IN_THREAD: {
        const newPosts: Post[] = Object.values(action.data.posts);
        if (newPosts.length === 0) {
            return state;
        }
        const postsForThread = state[action.rootId] || [];
        const nextPostsForThread = [...postsForThread];
        for (const post of newPosts) {
            if (post.root_id !== action.rootId) {
                continue;
            }
            if (nextPostsForThread.includes(post.id)) {
                continue;
            }
            nextPostsForThread.push(post.id);
        }
        return {
            ...state,
            [action.rootId]: nextPostsForThread,
        };
    }
    case PostTypes.POST_DELETED: {
        const post = action.data;
        const postsForThread = state[post.id];
        if (!postsForThread) {
            return state;
        }
        const nextState = {...state};
        Reflect.deleteProperty(nextState, post.id);
        return nextState;
    }
    case PostTypes.POST_REMOVED: {
        const post = action.data;
        if (post.root_id) {
            const postsForThread = state[post.root_id];
            if (!postsForThread) {
                return state;
            }
            const index = postsForThread.findIndex((postId) => postId === post.id);
            if (index === -1) {
                return state;
            }
            const nextPostsForThread = [...postsForThread];
            nextPostsForThread.splice(index, 1);
            return {
                ...state,
                [post.root_id]: nextPostsForThread,
            };
        }
        const postsForThread = state[post.id];
        if (!postsForThread) {
            return state;
        }
        const nextState = {...state};
        Reflect.deleteProperty(nextState, post.id);
        return nextState;
    }
    case ChannelTypes.LEAVE_CHANNEL: {
        const channelId = action.data.id;
        let postDeleted = false;
        const nextState = {...state};
        for (const rootId of Object.keys(state)) {
            if (prevPosts[rootId] && prevPosts[rootId].channel_id === channelId) {
                Reflect.deleteProperty(nextState, rootId);
                postDeleted = true;
            }
        }
        if (!postDeleted) {
            return state;
        }
        return nextState;
    }
    case UserTypes.LOGOUT_SUCCESS:
        return {};
    default:
        return state;
    }
}
export function postEditHistory(state: Post[] = [], action: MMReduxAction) {
    switch (action.type) {
    case PostTypes.RECEIVED_POST_HISTORY:
        return action.data;
    case UserTypes.LOGOUT_SUCCESS:
        return [];
    default:
        return state;
    }
}
function currentFocusedPostId(state = '', action: MMReduxAction) {
    switch (action.type) {
    case PostTypes.RECEIVED_FOCUSED_POST:
        return action.data;
    case UserTypes.LOGOUT_SUCCESS:
        return '';
    default:
        return state;
    }
}
export function reactions(state: RelationOneToOne<Post, Record<string, Reaction>> = {}, action: MMReduxAction) {
    switch (action.type) {
    case PostTypes.RECEIVED_REACTION: {
        const reaction = action.data as Reaction;
        const nextReactions = {...(state[reaction.post_id] || {})};
        nextReactions[reaction.user_id + '-' + reaction.emoji_name] = reaction;
        return {
            ...state,
            [reaction.post_id]: nextReactions,
        };
    }
    case PostTypes.REACTION_DELETED: {
        const reaction = action.data;
        const nextReactions = {...(state[reaction.post_id] || {})};
        if (!nextReactions[reaction.user_id + '-' + reaction.emoji_name]) {
            return state;
        }
        Reflect.deleteProperty(nextReactions, reaction.user_id + '-' + reaction.emoji_name);
        return {
            ...state,
            [reaction.post_id]: nextReactions,
        };
    }
    case PostTypes.RECEIVED_NEW_POST:
    case PostTypes.RECEIVED_POST: {
        const post = action.data;
        return storeReactionsForPost(state, post);
    }
    case PostTypes.RECEIVED_POSTS: {
        const posts: Post[] = Object.values(action.data.posts);
        return posts.reduce(storeReactionsForPost, state);
    }
    case PostTypes.POST_DELETED:
    case PostTypes.POST_REMOVED: {
        const post = action.data;
        if (post && state[post.id]) {
            const nextState = {...state};
            Reflect.deleteProperty(nextState, post.id);
            return nextState;
        }
        return state;
    }
    case UserTypes.LOGOUT_SUCCESS:
        return {};
    default:
        return state;
    }
}
export function acknowledgements(state: RelationOneToOne<Post, Record<UserProfile['id'], number>> = {}, action: MMReduxAction) {
    switch (action.type) {
    case PostTypes.CREATE_ACK_POST_SUCCESS: {
        const ack = action.data as PostAcknowledgement;
        const oldState = state[ack.post_id] || {};
        return {
            ...state,
            [ack.post_id]: {
                ...oldState,
                [ack.user_id]: ack.acknowledged_at,
            },
        };
    }
    case PostTypes.DELETE_ACK_POST_SUCCESS: {
        const ack = action.data;
        if (!state[ack.post_id] || !state[ack.post_id][ack.user_id]) {
            return state;
        }
        const acknowledgedAt = state[ack.post_id][ack.user_id];
        if (acknowledgedAt > ack.acknowledged_at) {
            return state;
        }
        const nextState = {...(state[ack.post_id])};
        Reflect.deleteProperty(nextState, ack.user_id);
        return {
            ...state,
            [ack.post_id]: {
                ...nextState,
            },
        };
    }
    case PostTypes.RECEIVED_POST: {
        const post = action.data;
        return storeAcknowledgementsForPost(state, post);
    }
    case PostTypes.RECEIVED_POSTS: {
        const posts: Post[] = Object.values(action.data.posts);
        return posts.reduce(storeAcknowledgementsForPost, state);
    }
    case PostTypes.POST_DELETED:
    case PostTypes.POST_REMOVED: {
        const post = action.data;
        if (post && state[post.id]) {
            const nextState = {...state};
            Reflect.deleteProperty(nextState, post.id);
            return nextState;
        }
        return state;
    }
    case UserTypes.LOGOUT_SUCCESS:
        return {};
    default:
        return state;
    }
}
function storeReactionsForPost(state: RelationOneToOne<Post, Record<string, Reaction>>, post: Post) {
    if (!post.metadata || post.delete_at > 0) {
        return state;
    }
    const reactionsForPost: Record<string, Reaction> = {};
    if (post.metadata.reactions && post.metadata.reactions.length > 0) {
        for (const reaction of post.metadata.reactions) {
            reactionsForPost[reaction.user_id + '-' + reaction.emoji_name] = reaction;
        }
    }
    return {
        ...state,
        [post.id]: reactionsForPost,
    };
}
function storeAcknowledgementsForPost(state: any, post: Post) {
    if (
        !post.metadata ||
        !post.metadata.acknowledgements ||
        !post.metadata.acknowledgements.length ||
        post.delete_at > 0
    ) {
        return state;
    }
    const acknowledgementsForPost: Record<UserProfile['id'], number> = {};
    if (post?.metadata?.acknowledgements && post.metadata.acknowledgements.length > 0) {
        for (const ack of post.metadata.acknowledgements) {
            acknowledgementsForPost[ack.user_id] = ack.acknowledged_at;
        }
    }
    return {
        ...state,
        [post.id]: acknowledgementsForPost,
    };
}
export function openGraph(state: RelationOneToOne<Post, Record<string, OpenGraphMetadata>> = {}, action: MMReduxAction) {
    switch (action.type) {
    case PostTypes.RECEIVED_NEW_POST:
    case PostTypes.RECEIVED_POST: {
        const post = action.data;
        return storeOpenGraphForPost(state, post);
    }
    case PostTypes.RECEIVED_POSTS: {
        const posts: Post[] = Object.values(action.data.posts);
        return posts.reduce(storeOpenGraphForPost, state);
    }
    case UserTypes.LOGOUT_SUCCESS:
        return {};
    default:
        return state;
    }
}
function storeOpenGraphForPost(state: any, post: Post) {
    if (!post.metadata || !post.metadata.embeds) {
        return state;
    }
    return post.metadata.embeds.reduce((nextState, embed) => {
        if (embed.type === 'permalink' && embed.data && 'post' in embed.data && embed.data.post) {
            const previewPost = embed.data.post;
            if (previewPost.metadata && previewPost.metadata.embeds) {
                return previewPost.metadata.embeds.reduce((nextState, embed) => {
                    if (embed.type !== 'opengraph' || !embed.data || nextState[previewPost.id]) {
                        return nextState;
                    }
                    return {
                        ...nextState,
                        [previewPost.id]: {[embed.url]: embed.data},
                    };
                }, nextState);
            }
        }
        if (embed.type !== 'opengraph' || !embed.data) {
            return nextState;
        }
        const postIdState = nextState[post.id] ? {...nextState[post.id], [embed.url]: embed.data} : {[embed.url]: embed.data};
        return {
            ...nextState,
            [post.id]: postIdState,
        };
    }, state);
}
function messagesHistory(state: Partial<MessageHistory> = {
    messages: [],
    index: {
        post: -1,
        comment: -1,
    },
}, action: MMReduxAction) {
    switch (action.type) {
    case PostTypes.ADD_MESSAGE_INTO_HISTORY: {
        const nextIndex: Record<string, number> = {};
        let nextMessages = state.messages ? [...state.messages] : [];
        nextMessages.push(action.data);
        nextIndex[Posts.MESSAGE_TYPES.POST] = nextMessages.length;
        nextIndex[Posts.MESSAGE_TYPES.COMMENT] = nextMessages.length;
        if (nextMessages.length > Posts.MAX_PREV_MSGS) {
            nextMessages = nextMessages.slice(1, Posts.MAX_PREV_MSGS + 1);
        }
        return {
            messages: nextMessages,
            index: nextIndex,
        };
    }
    case PostTypes.RESET_HISTORY_INDEX: {
        const index: Record<string, number> = {};
        index[Posts.MESSAGE_TYPES.POST] = -1;
        index[Posts.MESSAGE_TYPES.COMMENT] = -1;
        const messages = state.messages || [];
        const nextIndex = state.index ? {...state.index} : index;
        nextIndex[action.data] = messages.length;
        return {
            messages: state.messages,
            index: nextIndex,
        };
    }
    case PostTypes.MOVE_HISTORY_INDEX_BACK: {
        const index: Record<string, number> = {};
        index[Posts.MESSAGE_TYPES.POST] = -1;
        index[Posts.MESSAGE_TYPES.COMMENT] = -1;
        const nextIndex = state.index ? {...state.index} : index;
        if (nextIndex[action.data] > 0) {
            nextIndex[action.data]--;
        }
        return {
            messages: state.messages,
            index: nextIndex,
        };
    }
    case PostTypes.MOVE_HISTORY_INDEX_FORWARD: {
        const index: Record<string, number> = {};
        index[Posts.MESSAGE_TYPES.POST] = -1;
        index[Posts.MESSAGE_TYPES.COMMENT] = -1;
        const messages = state.messages || [];
        const nextIndex = state.index ? {...state.index} : index;
        if (nextIndex[action.data] < messages.length) {
            nextIndex[action.data]++;
        }
        return {
            messages: state.messages,
            index: nextIndex,
        };
    }
    case UserTypes.LOGOUT_SUCCESS: {
        const index: Record<string, number> = {};
        index[Posts.MESSAGE_TYPES.POST] = -1;
        index[Posts.MESSAGE_TYPES.COMMENT] = -1;
        return {
            messages: [],
            index,
        };
    }
    default:
        return state;
    }
}
export const zeroStateLimitedViews = {
    threads: {},
    channels: {},
};
export function limitedViews(
    state: PostsState['limitedViews'] = zeroStateLimitedViews,
    action: MMReduxAction,
): PostsState['limitedViews'] {
    switch (action.type) {
    case PostTypes.RECEIVED_POSTS:
    case PostTypes.RECEIVED_POSTS_AFTER:
    case PostTypes.RECEIVED_POSTS_BEFORE:
    case PostTypes.RECEIVED_POSTS_SINCE:
    case PostTypes.RECEIVED_POSTS_IN_CHANNEL: {
        if (action.data.first_inaccessible_post_time && action.channelId) {
            return {
                ...state,
                channels: {
                    ...state.channels,
                    [action.channelId]: action.data.first_inaccessible_post_time || 0,
                },
            };
        }
        return state;
    }
    case PostTypes.RECEIVED_POSTS_IN_THREAD: {
        if (action.data.first_inaccessible_post_time && action.rootId) {
            return {
                ...state,
                threads: {
                    ...state.threads,
                    [action.rootId]: action.data.first_inaccessible_post_time || 0,
                },
            };
        }
        return state;
    }
    case CloudTypes.RECEIVED_CLOUD_LIMITS: {
        const {limits} = action.data;
        if (!limits?.messages || (!limits?.messages?.history && limits?.messages?.history !== 0)) {
            return zeroStateLimitedViews;
        }
        return state;
    }
    case LimitsTypes.RECEIVED_APP_LIMITS: {
        const serverLimits = action.data;
        if (!serverLimits?.postHistoryLimit || serverLimits.postHistoryLimit <= 0) {
            return zeroStateLimitedViews;
        }
        return state;
    }
    case ChannelTypes.LEAVE_CHANNEL: {
        const channelId = action.data.id;
        if (!state.channels[channelId]) {
            return state;
        }
        const newState = {
            threads: state.threads,
            channels: {...state.channels},
        };
        delete newState.channels[channelId];
        return newState;
    }
    default:
        return state;
    }
}
export default function reducer(state: Partial<PostsState> = {}, action: MMReduxAction) {
    const nextPosts = handlePosts(state.posts, action);
    const nextPostsInChannel = postsInChannel(state.postsInChannel, action, state.posts!, nextPosts);
    const nextState = {
        posts: nextPosts,
        postsReplies: nextPostsReplies(state.postsReplies, action),
        pendingPostIds: handlePendingPosts(state.pendingPostIds, action),
        postsInChannel: nextPostsInChannel,
        postsInThread: postsInThread(state.postsInThread, action, state.posts!),
        postEditHistory: postEditHistory(state.postEditHistory, action),
        currentFocusedPostId: currentFocusedPostId(state.currentFocusedPostId, action),
        reactions: reactions(state.reactions, action),
        openGraph: openGraph(state.openGraph, action),
        messagesHistory: messagesHistory(state.messagesHistory, action),
        acknowledgements: acknowledgements(state.acknowledgements, action),
        limitedViews: limitedViews(state.limitedViews, action),
    };
    if (state.posts === nextState.posts && state.postsInChannel === nextState.postsInChannel &&
        state.postsInThread === nextState.postsInThread &&
        state.pendingPostIds === nextState.pendingPostIds &&
        state.postEditHistory === nextState.postEditHistory &&
        state.currentFocusedPostId === nextState.currentFocusedPostId &&
        state.reactions === nextState.reactions &&
        state.acknowledgements === nextState.acknowledgements &&
        state.openGraph === nextState.openGraph &&
        state.messagesHistory === nextState.messagesHistory &&
        state.limitedViews === nextState.limitedViews) {
        return state;
    }
    return nextState;
}