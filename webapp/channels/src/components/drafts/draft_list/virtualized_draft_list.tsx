import classNames from 'classnames';
import debounce from 'lodash/debounce';
import type {CSSProperties} from 'react';
import React, {useMemo, useRef, useCallback, useEffect, memo} from 'react';
import AutoSizer from 'react-virtualized-auto-sizer';
import {VariableSizeList} from 'react-window';
import type {UserProfile, UserStatus} from '@mattermost/types/users';
import type {Draft} from 'selectors/drafts';
import DraftRow from 'components/drafts/draft_row';
const OVERSCAN_ROW_COUNT = 6;
const ROW_HEIGHT_CHANGE_TOLERANCE = 4;
const RESIZE_DEBOUNCE_TIME = 120;
type Props = {
    drafts: Draft[];
    currentUser: UserProfile;
    userDisplayName: string;
    userStatus: UserStatus['status'];
    draftRemotes: Record<string, boolean>;
}
export default function VirtualizedDraftList(props: Props) {
    const listRef = useRef<VariableSizeList>(null);
    const itemHeightCacheMap = useRef<Map<string, number>>(new Map());
    const setRowHeight = useCallback((index: number, draftKey: string, size: number) => {
        const currentItemHeight = itemHeightCacheMap.current.get(draftKey);
        if (!currentItemHeight || (Math.abs(currentItemHeight - size) > ROW_HEIGHT_CHANGE_TOLERANCE)) {
            itemHeightCacheMap.current.set(draftKey, size);
            if (listRef.current) {
                listRef.current.resetAfterIndex(index);
            }
        }
    }, []);
    const getItemSize = useCallback((index: number) => {
        const draftKey = index < props.drafts.length ? props.drafts[index].key : '';
        return draftKey ? (itemHeightCacheMap.current.get(draftKey) || 0) : 0;
    }, [props.drafts]);
    const itemData = useMemo(() => ({
        drafts: props.drafts,
        userDisplayName: props.userDisplayName,
        draftRemotes: props.draftRemotes,
        currentUser: props.currentUser,
        userStatus: props.userStatus,
        setRowHeight,
    }), [props.drafts, props.userDisplayName, props.draftRemotes, props.currentUser, props.userStatus, setRowHeight]);
    return (
        <div className='DraftList Drafts__main'>
            <AutoSizer>
                {({height, width}) => (
                    <VariableSizeList
                        ref={listRef}
                        height={height}
                        width={width}
                        itemCount={props.drafts.length}
                        itemSize={getItemSize}
                        itemData={itemData}
                        overscanCount={OVERSCAN_ROW_COUNT}
                    >
                        {Row}
                    </VariableSizeList>
                )}
            </AutoSizer>
        </div>
    );
}
interface RowProps {
    index: number;
    style: CSSProperties;
    data: {
        drafts: Draft[];
        userDisplayName: string;
        draftRemotes: Record<string, boolean>;
        currentUser: UserProfile;
        userStatus: string;
        setRowHeight: (index: number, draftKey: string, size: number) => void;
    };
}
function RowComponent({index, style, data: {drafts, userDisplayName, draftRemotes, currentUser, userStatus, setRowHeight}}: RowProps) {
    const draft = drafts[index];
    const rowRef = useRef<HTMLDivElement>(null);
    const indexRef = useRef(index);
    const draftKeyRef = useRef(draft.key);
    const setRowHeightRef = useRef(setRowHeight);
    useEffect(() => {
        indexRef.current = index;
        draftKeyRef.current = draft.key;
        setRowHeightRef.current = setRowHeight;
    }, [index, draft.key, setRowHeight]);
    useEffect(() => {
        if (!rowRef.current) {
            return undefined;
        }
        const rafId = requestAnimationFrame(() => {
            if (!rowRef.current) {
                return;
            }
            const height = rowRef.current.getBoundingClientRect().height;
            setRowHeight(index, draft.key, height);
        });
        return () => {
            cancelAnimationFrame(rafId);
        };
    }, [draft, setRowHeight, index]);
    useEffect(() => {
        if (!rowRef.current) {
            return undefined;
        }
        let isObservingResize = true;
        const debouncedUpdateHeight = debounce((height: number) => {
            if (!isObservingResize || !rowRef.current) {
                return;
            }
            setRowHeightRef.current(
                indexRef.current,
                draftKeyRef.current,
                height,
            );
        }, RESIZE_DEBOUNCE_TIME);
        const resizeObserver = new ResizeObserver((resizeEntries) => {
            if (!isObservingResize || !rowRef.current) {
                return;
            }
            if (resizeEntries.length === 1 && resizeEntries[0].target === rowRef.current) {
                const height = resizeEntries[0].borderBoxSize[0].blockSize;
                debouncedUpdateHeight(height);
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
        <div style={style}> {}
            <div
                ref={rowRef}
                className={classNames('virtualizedVariableListRowWrapper', {
                    firstRow: index === 0,
                })}
            >
                <DraftRow
                    key={draft.key}
                    item={draft.value}
                    displayName={userDisplayName}
                    user={currentUser}
                    status={userStatus}
                    isRemote={draftRemotes?.[draft.key]}
                />
            </div>
        </div>
    );
}
const Row = memo(RowComponent);