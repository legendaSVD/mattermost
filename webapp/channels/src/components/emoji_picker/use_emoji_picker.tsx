import type {UseFloatingOptions, UseFloatingReturn} from '@floating-ui/react';
import {
    flip,
    FloatingFocusManager,
    FloatingOverlay,
    FloatingPortal,
    offset,
    shift,
    useClick,
    useDismiss,
    useFloating,
    useInteractions,
    useRole,
} from '@floating-ui/react';
import React, {useCallback} from 'react';
import {useSelector} from 'react-redux';
import type {Emoji} from '@mattermost/types/emojis';
import {getIsMobileView} from 'selectors/views/browser';
import {RootHtmlPortalId} from 'utils/constants';
import EmojiPickerTabs from './emoji_picker_tabs';
export const useEmojiPickerOffset = 4;
type UseEmojiPickerOptions = {
    showEmojiPicker: boolean;
    setShowEmojiPicker: (showEmojiPicker: boolean) => void;
    enableGifPicker?: boolean;
    onAddCustomEmojiClick?: () => void;
    onEmojiClick: (emoji: Emoji) => void;
    onGifClick?: (gif: string) => void;
    overrideMiddleware?: UseFloatingOptions['middleware'];
}
type UseEmojiPickerReturn = {
    emojiPicker: React.ReactNode;
    getReferenceProps: ReturnType<typeof useInteractions>['getReferenceProps'];
    setReference: UseFloatingReturn['refs']['setReference'];
}
export default function useEmojiPicker({
    showEmojiPicker,
    setShowEmojiPicker,
    enableGifPicker,
    onAddCustomEmojiClick,
    onEmojiClick,
    onGifClick,
    overrideMiddleware,
}: UseEmojiPickerOptions): UseEmojiPickerReturn {
    const isMobileView = useSelector(getIsMobileView);
    const hideEmojiPicker = useCallback(() => setShowEmojiPicker(false), [setShowEmojiPicker]);
    let middleware: UseFloatingOptions['middleware'];
    if (isMobileView) {
        middleware = [];
    } else if (overrideMiddleware) {
        middleware = overrideMiddleware;
    } else {
        middleware = [
            offset(useEmojiPickerOffset),
            shift(),
            flip({
                fallbackAxisSideDirection: 'end',
            }),
        ];
    }
    const {context: floatingContext, floatingStyles, refs} = useFloating({
        open: showEmojiPicker,
        onOpenChange: setShowEmojiPicker,
        middleware,
        placement: 'top',
    });
    const clickInteractions = useClick(floatingContext);
    const dismissInteraction = useDismiss(floatingContext);
    const role = useRole(floatingContext);
    const {getReferenceProps, getFloatingProps} = useInteractions([
        clickInteractions,
        dismissInteraction,
        role,
    ]);
    let emojiPicker = (
        <EmojiPickerTabs
            enableGifPicker={enableGifPicker}
            onAddCustomEmojiClick={onAddCustomEmojiClick}
            onEmojiClose={hideEmojiPicker}
            onEmojiClick={onEmojiClick}
            onGifClick={onGifClick}
        />
    );
    if (isMobileView) {
        emojiPicker = (
            <div ref={refs.setFloating}>
                {emojiPicker}
            </div>
        );
    } else {
        emojiPicker = (
            <div
                ref={refs.setFloating}
                style={{...floatingStyles}}
                {...getFloatingProps()}
            >
                {emojiPicker}
            </div>
        );
    }
    return {
        emojiPicker: (
            showEmojiPicker && <FloatingPortal id={RootHtmlPortalId}>
                <FloatingOverlay className='emoji-picker-overlay'>
                    <FloatingFocusManager context={floatingContext}>
                        {emojiPicker}
                    </FloatingFocusManager>
                </FloatingOverlay>
            </FloatingPortal>
        ),
        getReferenceProps,
        setReference: refs.setReference,
    };
}