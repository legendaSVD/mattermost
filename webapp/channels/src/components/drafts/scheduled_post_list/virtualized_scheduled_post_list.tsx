import classNames from 'classnames';
import debounce from 'lodash/debounce';
import type {CSSProperties} from 'react';
import React, {useMemo, useRef, useCallback, useEffect} from 'react';
import AutoSizer from 'react-virtualized-auto-sizer';
import {VariableSizeList} from 'react-window';
import type {ScheduledPost} from '@mattermost/types/schedule_post';
import type {UserProfile, UserStatus} from '@mattermost/types/users';
import DraftRow from 'components/drafts/draft_row';
import {useQuery} from 'utils/http_utils';
const TARGET_ID_QUERY_PARAM = 'target_id';
const OVERSCAN_ROW_COUNT = 10;
const ROW_HEIGHT_CHANGE_TOLERANCE = 2;
const FRAME_RATE = 60;
const RESIZE_DEBOUNCE_TIME = Math.round(1000 / FRAME_RATE);
type Props = {
    scheduledPosts: ScheduledPost[];
    currentUser: UserProfile;
    userDisplayName: string;
    userStatus: UserStatus['status'];
}
export default function ScheduledPostList(props: Props) {
    const query = useQuery();
    const scheduledPostTargetId = query.get(TARGET_ID_QUERY_PARAM);
    const targetScheduledPostId = useRef<string>();
    const listRef = useRef<VariableSizeList>(null);
    const itemHeightCacheMap = useRef<Map<string, number>>(new Map());
    const setRowHeight = useCallback((index: number, postId: string, size: number) => {
        const currentItemHeight = itemHeightCacheMap.current.get(postId);
        if (!currentItemHeight || Math.abs(currentItemHeight - size) > ROW_HEIGHT_CHANGE_TOLERANCE) {
            itemHeightCacheMap.current.set(postId, size);
            if (listRef.current) {
                listRef.current.resetAfterIndex(index);
            }
        }
    }, []);
    const getItemSize = useCallback((index: number) => {
        const postId = index < props.scheduledPosts.length ? props.scheduledPosts[index].id : '';
        return postId ? (itemHeightCacheMap.current.get(postId) || 0) : 0;
    }, [props.scheduledPosts]);
    useEffect(() => {
        if (itemHeightCacheMap.current.size > 0) {
            const updatedItemHeightCacheMap = new Map<string, number>();
            for (const post of props.scheduledPosts) {
                const height = itemHeightCacheMap.current.get(post.id);
                if (height) {
                    updatedItemHeightCacheMap.set(post.id, height);
                }
            }
            itemHeightCacheMap.current = updatedItemHeightCacheMap;
        }
        if (listRef.current) {
            listRef.current.resetAfterIndex(0);
        }
    }, [props.scheduledPosts]);
    useEffect(() => {
        if (!scheduledPostTargetId || !listRef.current) {
            return;
        }
        const targetIndex = props.scheduledPosts.findIndex((post) => {
            const isInTargetChannelOrThread = post.channel_id === scheduledPostTargetId || post.root_id === scheduledPostTargetId;
            const hasError = Boolean(post.error_code);
            return isInTargetChannelOrThread && !hasError && !targetScheduledPostId.current;
        });
        if (targetIndex !== -1) {
            targetScheduledPostId.current = props.scheduledPosts[targetIndex].id;
            listRef.current.scrollToItem(targetIndex, 'center');
        }
    }, [props.scheduledPosts, scheduledPostTargetId]);
    const itemData = useMemo(() => ({
        scheduledPosts: props.scheduledPosts,
        userDisplayName: props.userDisplayName,
        currentUser: props.currentUser,
        userStatus: props.userStatus,
        setRowHeight,
        targetScheduledPostId: targetScheduledPostId.current,
        scheduledPostTargetId,
    }), [props.scheduledPosts, props.userDisplayName, props.currentUser, props.userStatus, setRowHeight, scheduledPostTargetId]);
    return (
        <AutoSizer>
            {({height, width}) => (
                <VariableSizeList
                    ref={listRef}
                    height={height}
                    width={width}
                    itemCount={props.scheduledPosts.length}
                    itemSize={getItemSize}
                    itemData={itemData}
                    overscanCount={OVERSCAN_ROW_COUNT}
                >
                    {Row}
                </VariableSizeList>
            )}
        </AutoSizer>
    );
}
interface RowProps {
    index: number;
    style: CSSProperties;
    data: {
        scheduledPosts: ScheduledPost[];
        userDisplayName: string;
        currentUser: UserProfile;
        userStatus: string;
        setRowHeight: (index: number, postId: string, size: number) => void;
        targetScheduledPostId?: string;
        scheduledPostTargetId?: string | null;
    };
}
function Row({index, style, data: {scheduledPosts, userDisplayName, currentUser, userStatus, setRowHeight, targetScheduledPostId, scheduledPostTargetId}}: RowProps) {
    const scheduledPost = scheduledPosts[index];
    const rowRef = useRef<HTMLDivElement>(null);
    const lastMeasuredHeightRef = useRef<number | null>(null);
    const indexRef = useRef(index);
    const postIdRef = useRef(scheduledPost.id);
    const setRowHeightRef = useRef(setRowHeight);
    useEffect(() => {
        indexRef.current = index;
        postIdRef.current = scheduledPost.id;
        setRowHeightRef.current = setRowHeight;
    }, [index, scheduledPost.id, setRowHeight]);
    const isInTargetChannelOrThread = scheduledPost.channel_id === scheduledPostTargetId || scheduledPost.root_id === scheduledPostTargetId;
    const hasError = Boolean(scheduledPost.error_code);
    const scrollIntoView = targetScheduledPostId === scheduledPost.id || (isInTargetChannelOrThread && !hasError && !targetScheduledPostId);
    useEffect(() => {
        if (!rowRef.current) {
            return undefined;
        }
        const rafId = requestAnimationFrame(() => {
            if (!rowRef.current) {
                return;
            }
            const height = Math.max(rowRef.current.getBoundingClientRect().height);
            lastMeasuredHeightRef.current = height;
            setRowHeight(index, scheduledPost.id, height);
        });
        return () => {
            cancelAnimationFrame(rafId);
        };
    }, [scheduledPost, setRowHeight, index, scheduledPost.id]);
    useEffect(() => {
        if (!rowRef.current) {
            return undefined;
        }
        let isObservingResize = true;
        const debouncedUpdateHeight = debounce((height: number) => {
            if (!isObservingResize || !rowRef.current) {
                return;
            }
            if (lastMeasuredHeightRef.current !== null && Math.abs((lastMeasuredHeightRef.current - height)) <= ROW_HEIGHT_CHANGE_TOLERANCE) {
                return;
            }
            lastMeasuredHeightRef.current = height;
            setRowHeightRef.current(
                indexRef.current,
                postIdRef.current,
                height,
            );
        }, RESIZE_DEBOUNCE_TIME);
        const resizeObserver = new ResizeObserver((entries) => {
            if (!isObservingResize || !rowRef.current) {
                return;
            }
            for (const entry of entries) {
                if (entry.target === rowRef.current) {
                    const height = entry.borderBoxSize[0].blockSize;
                    debouncedUpdateHeight(height);
                }
            }
        });
        resizeObserver.observe(rowRef.current);
        return () => {
            isObservingResize = false;
            debouncedUpdateHeight.cancel();
            resizeObserver.disconnect();
        };
    }, []);
    return (
        <div style={style}>
            <div
                ref={rowRef}
                className={classNames('virtualizedVariableListRowWrapper', {
                    firstRow: index === 0,
                })}
            >
                <DraftRow
                    key={scheduledPost.id}
                    item={scheduledPost}
                    displayName={userDisplayName}
                    user={currentUser}
                    status={userStatus}
                    scrollIntoView={scrollIntoView}
                />
            </div>
        </div>
    );
}