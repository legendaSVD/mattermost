import debounce from 'lodash/debounce';
import type {ReactNode} from 'react';
import React, {memo, useLayoutEffect, useRef} from 'react';
import {ListItemSizeObserver} from './list_item_size_observer';
const RESIZE_DEBOUNCE_TIME = 200;
const listItemSizeObserver = ListItemSizeObserver.getInstance();
export interface Props {
    item: ReactNode;
    itemId: string;
    index: number;
    height: number;
    width?: number;
    onHeightChange: (itemId: string, height: number, forceScrollCorrection: boolean) => void;
    onUnmount: (itemId: string, index: number) => void;
}
const ListItem = (props: Props) => {
    const rowRef = useRef<HTMLDivElement>(null);
    const heightRef = useRef(props.height);
    const widthRef = useRef(props.width);
    const indexRef = useRef(props.index);
    useLayoutEffect(() => {
        heightRef.current = props.height;
        widthRef.current = props.width;
        indexRef.current = props.index;
    }, [props.itemId, props.height, props.width, props.index]);
    useLayoutEffect(() => {
        const newHeight = Math.ceil(rowRef?.current?.offsetHeight ?? 0);
        props.onHeightChange(props.itemId, newHeight, false);
    }, [props.itemId]);
    useLayoutEffect(() => {
        const debouncedOnHeightChange = debounce((changedHeight: number) => {
            if (!rowRef.current) {
                return;
            }
            const forceScrollCorrection = rowRef.current.offsetWidth !== widthRef.current;
            heightRef.current = changedHeight;
            props.onHeightChange(props.itemId, changedHeight, forceScrollCorrection);
        }, RESIZE_DEBOUNCE_TIME);
        function itemRowSizeObserverCallback(changedHeight: number) {
            if (!rowRef.current) {
                return;
            }
            if (changedHeight !== heightRef.current) {
                debouncedOnHeightChange(changedHeight);
            }
        }
        let cleanupSizeObserver: () => void;
        if (rowRef.current) {
            cleanupSizeObserver = listItemSizeObserver.observe(props.itemId, rowRef.current, itemRowSizeObserverCallback);
        }
        return () => {
            cleanupSizeObserver?.();
            debouncedOnHeightChange?.cancel();
            props.onUnmount(props.itemId, indexRef.current);
        };
    }, [props.itemId]);
    return (
        <div
            ref={rowRef}
            role='listitem'
            className='item_measurer'
        >
            {props.item}
        </div>
    );
};
export default memo(ListItem);