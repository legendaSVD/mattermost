import React from 'react';
import type {ActionResult} from 'mattermost-redux/types/actions';
import type {updateNewMessagesAtInChannel} from 'actions/global_actions';
import {clearMarks, mark} from 'actions/telemetry_actions.jsx';
import type {LoadPostsParameters, LoadPostsReturnValue, CanLoadMorePosts} from 'actions/views/channel';
import LoadingScreen from 'components/loading_screen';
import VirtPostList from 'components/post_view/post_list_virtualized/post_list_virtualized';
import {PostRequestTypes, Constants} from 'utils/constants';
import {Mark, Measure, measureAndReport} from 'utils/performance_telemetry';
import {getOldestPostId, getLatestPostId} from 'utils/post_utils';
const MAX_NUMBER_OF_AUTO_RETRIES = 3;
export const MAX_EXTRA_PAGES_LOADED = 30;
const USER_SCROLL_POSTS_PER_PAGE = Constants.POST_CHUNK_SIZE / 2;
const AUTO_LOAD_POSTS_PER_PAGE = 200;
function markAndMeasureChannelSwitchEnd(fresh = false) {
    mark(Mark.PostListLoaded);
    measureAndReport({
        name: Measure.ChannelSwitch,
        startMark: Mark.ChannelLinkClicked,
        endMark: Mark.PostListLoaded,
        labels: {
            fresh: fresh.toString(),
        },
        canFail: true,
    });
    measureAndReport({
        name: Measure.TeamSwitch,
        startMark: Mark.TeamLinkClicked,
        endMark: Mark.PostListLoaded,
        labels: {
            fresh: fresh.toString(),
        },
        canFail: true,
    });
    clearMarks([
        Mark.ChannelLinkClicked,
        Mark.TeamLinkClicked,
        Mark.PostListLoaded,
    ]);
}
export interface Props {
    formattedPostIds?: string[];
    postListIds?: string[];
    channelId: string;
    focusedPostId?: string;
    atLatestPost: boolean;
    atOldestPost?: boolean;
    isFirstLoad: boolean;
    latestPostTimeStamp?: number;
    changeUnreadChunkTimeStamp: (lastViewedAt: number) => void;
    isPrefetchingInProcess: boolean;
    isMobileView: boolean;
    lastViewedAt: number;
    toggleShouldStartFromBottomWhenUnread: () => void;
    shouldStartFromBottomWhenUnread: boolean;
    hasInaccessiblePosts: boolean;
    isChannelAutotranslated: boolean;
    actions: {
        loadPostsAround: (channelId: string, focusedPostId: string) => Promise<ActionResult>;
        loadUnreads: (channelId: string) => Promise<ActionResult>;
        loadPosts: (parameters: LoadPostsParameters) => Promise<LoadPostsReturnValue>;
        syncPostsInChannel: (channelId: string, since: number, prefetch: boolean) => Promise<ActionResult>;
        loadLatestPosts: (channelId: string) => Promise<ActionResult>;
        markChannelAsRead: (channelId: string) => void;
        updateNewMessagesAtInChannel: typeof updateNewMessagesAtInChannel;
    };
}
interface State {
    loadingNewerPosts: boolean;
    loadingOlderPosts: boolean;
    autoRetryEnable: boolean;
}
export default class PostList extends React.PureComponent<Props, State> {
    private autoRetriesCount: number;
    private actionsForPostList: {
        loadOlderPosts: () => Promise<void>;
        loadNewerPosts: () => Promise<void>;
        canLoadMorePosts: (type: CanLoadMorePosts) => Promise<void>;
        changeUnreadChunkTimeStamp: (lastViewedAt: number) => void;
        updateNewMessagesAtInChannel: typeof updateNewMessagesAtInChannel;
        toggleShouldStartFromBottomWhenUnread: () => void;
    };
    private mounted: boolean | undefined;
    public extraPagesLoaded: number;
    constructor(props: Props) {
        super(props);
        this.state = {
            loadingNewerPosts: false,
            loadingOlderPosts: false,
            autoRetryEnable: true,
        };
        this.extraPagesLoaded = 0;
        this.autoRetriesCount = 0;
        this.actionsForPostList = {
            loadOlderPosts: this.getPostsBefore,
            loadNewerPosts: this.getPostsAfter,
            canLoadMorePosts: this.canLoadMorePosts,
            changeUnreadChunkTimeStamp: props.changeUnreadChunkTimeStamp,
            toggleShouldStartFromBottomWhenUnread: props.toggleShouldStartFromBottomWhenUnread,
            updateNewMessagesAtInChannel: this.props.actions.updateNewMessagesAtInChannel,
        };
    }
    componentDidMount() {
        this.mounted = true;
        if (this.props.channelId) {
            this.postsOnLoad(this.props.channelId);
            if (this.props.postListIds) {
                markAndMeasureChannelSwitchEnd();
            }
        }
    }
    componentDidUpdate(prevProps: Props) {
        if (this.props.channelId !== prevProps.channelId || this.props.focusedPostId !== prevProps.focusedPostId) {
            this.postsOnLoad(this.props.channelId);
        }
        if (this.props.postListIds != null && prevProps.postListIds == null) {
            markAndMeasureChannelSwitchEnd(true);
        }
    }
    componentWillUnmount() {
        this.mounted = false;
    }
    postsOnLoad = async (channelId: string) => {
        const {focusedPostId, isFirstLoad, latestPostTimeStamp, isPrefetchingInProcess, actions} = this.props;
        if (focusedPostId) {
            await actions.loadPostsAround(channelId, focusedPostId);
        } else if (isFirstLoad) {
            if (!isPrefetchingInProcess) {
                await actions.loadUnreads(channelId);
            }
        } else if (latestPostTimeStamp) {
            await actions.syncPostsInChannel(channelId, latestPostTimeStamp, false);
        } else {
            await actions.loadLatestPosts(channelId);
        }
        if (!focusedPostId) {
            this.props.actions.markChannelAsRead(channelId);
        }
        if (this.mounted) {
            this.setState({
                loadingOlderPosts: false,
                loadingNewerPosts: false,
            });
        }
    };
    callLoadPosts = async (channelId: string, postId: string, type: CanLoadMorePosts, perPage: number) => {
        const {error} = await this.props.actions.loadPosts({
            channelId,
            postId,
            type,
            perPage,
        });
        if (type === PostRequestTypes.BEFORE_ID) {
            this.setState({loadingOlderPosts: false});
        } else {
            this.setState({loadingNewerPosts: false});
        }
        if (error) {
            if (this.autoRetriesCount < MAX_NUMBER_OF_AUTO_RETRIES) {
                this.autoRetriesCount++;
                await this.callLoadPosts(channelId, postId, type, perPage);
            } else if (this.mounted) {
                this.setState({autoRetryEnable: false});
            }
        } else {
            if (this.mounted) {
                this.setState({autoRetryEnable: true});
            }
            if (!this.state.autoRetryEnable) {
                this.autoRetriesCount = 0;
            }
        }
        return {error};
    };
    getOldestVisiblePostId = () => {
        return getOldestPostId(this.props.postListIds || []);
    };
    getLatestVisiblePostId = () => {
        return getLatestPostId(this.props.postListIds || []);
    };
    canLoadMorePosts = async (type: CanLoadMorePosts = PostRequestTypes.BEFORE_ID) => {
        if (this.props.hasInaccessiblePosts) {
            return;
        }
        if (!this.props.postListIds) {
            return;
        }
        if (this.state.loadingOlderPosts || this.state.loadingNewerPosts) {
            return;
        }
        if (this.extraPagesLoaded > MAX_EXTRA_PAGES_LOADED) {
            if (this.state.autoRetryEnable) {
                this.setState({autoRetryEnable: false});
            }
            return;
        }
        if (!this.props.atOldestPost && type === PostRequestTypes.BEFORE_ID) {
            await this.getPostsBeforeAutoLoad();
        } else if (!this.props.atLatestPost) {
            await this.getPostsAfter();
        }
        this.extraPagesLoaded += 1;
    };
    getPostsBefore = async () => {
        if (this.state.loadingOlderPosts) {
            return;
        }
        if (!this.state.autoRetryEnable) {
            this.extraPagesLoaded = 0;
        }
        const oldestPostId = this.getOldestVisiblePostId();
        this.setState({loadingOlderPosts: true});
        await this.callLoadPosts(this.props.channelId, oldestPostId, PostRequestTypes.BEFORE_ID, USER_SCROLL_POSTS_PER_PAGE);
    };
    getPostsAfter = async () => {
        if (this.state.loadingNewerPosts) {
            return;
        }
        if (!this.state.autoRetryEnable) {
            this.extraPagesLoaded = 0;
        }
        const latestPostId = this.getLatestVisiblePostId();
        this.setState({loadingNewerPosts: true});
        await this.callLoadPosts(this.props.channelId, latestPostId, PostRequestTypes.AFTER_ID, USER_SCROLL_POSTS_PER_PAGE);
    };
    getPostsBeforeAutoLoad = async () => {
        if (this.state.loadingOlderPosts) {
            return;
        }
        const oldestPostId = this.getOldestVisiblePostId();
        this.setState({loadingOlderPosts: true});
        await this.callLoadPosts(this.props.channelId, oldestPostId, PostRequestTypes.BEFORE_ID, AUTO_LOAD_POSTS_PER_PAGE);
    };
    render() {
        if (!this.props.postListIds) {
            return (
                <LoadingScreen centered={true}/>
            );
        }
        return (
            <div className='post-list-holder-by-time'>
                <div className='post-list__table'>
                    <div
                        id='virtualizedPostListContent'
                        className='post-list__content'
                    >
                        <VirtPostList
                            loadingNewerPosts={this.state.loadingNewerPosts}
                            loadingOlderPosts={this.state.loadingOlderPosts}
                            atOldestPost={this.props.atOldestPost}
                            atLatestPost={this.props.atLatestPost}
                            focusedPostId={this.props.focusedPostId}
                            channelId={this.props.channelId}
                            autoRetryEnable={this.state.autoRetryEnable}
                            shouldStartFromBottomWhenUnread={this.props.shouldStartFromBottomWhenUnread}
                            actions={this.actionsForPostList}
                            postListIds={this.props.formattedPostIds}
                            latestPostTimeStamp={this.props.latestPostTimeStamp}
                            isMobileView={this.props.isMobileView}
                            lastViewedAt={this.props.lastViewedAt}
                            isChannelAutotranslated={this.props.isChannelAutotranslated}
                        />
                    </div>
                </div>
            </div>
        );
    }
}