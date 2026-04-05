import React, {
    forwardRef,
    memo,
} from 'react';
import type {
    ChangeEvent,
    KeyboardEvent} from 'react';
import {useIntl} from 'react-intl';
import {EMOJI_PER_ROW} from 'components/emoji_picker/constants';
import {NavigationDirection} from 'components/emoji_picker/types';
import Constants from 'utils/constants';
interface Props {
    value: string;
    cursorCategoryIndex: number;
    cursorEmojiIndex: number;
    focus: () => void;
    onEnter: () => void;
    onChange: (value: string) => void;
    onKeyDown: (moveTo: NavigationDirection) => void;
    resetCursorPosition: () => void;
}
const KeyCodes = Constants.KeyCodes;
const EmojiPickerSearch = forwardRef<HTMLInputElement, Props>(({value, cursorCategoryIndex, cursorEmojiIndex, onChange, resetCursorPosition, onKeyDown, focus, onEnter}: Props, ref) => {
    const {formatMessage} = useIntl();
    const handleChange = (event: ChangeEvent<HTMLInputElement>) => {
        event.preventDefault();
        const value = event.target.value.replace(/^:|:$/g, '');
        onChange(value);
        resetCursorPosition();
    };
    const handleKeyDown = (event: KeyboardEvent<HTMLInputElement>) => {
        switch (event.key) {
        case KeyCodes.RIGHT[0]:
            if ((event.currentTarget?.selectionStart ?? 0) + 1 > value.length || (cursorCategoryIndex !== -1 || cursorEmojiIndex !== -1)) {
                event.stopPropagation();
                event.preventDefault();
                onKeyDown(NavigationDirection.NextEmoji);
            }
            break;
        case KeyCodes.LEFT[0]:
            if (cursorCategoryIndex > 0 || cursorEmojiIndex > 0) {
                event.stopPropagation();
                event.preventDefault();
                onKeyDown(NavigationDirection.PreviousEmoji);
            } else if (cursorCategoryIndex === 0 && cursorEmojiIndex === 0) {
                resetCursorPosition();
                event.currentTarget.selectionStart = value.length;
                event.currentTarget.selectionEnd = value.length;
                event.stopPropagation();
                event.preventDefault();
                focus();
            }
            break;
        case KeyCodes.UP[0]:
            event.stopPropagation();
            event.preventDefault();
            if (event.shiftKey) {
                event.currentTarget.selectionStart = 0;
            } else if (cursorCategoryIndex === -1) {
                event.currentTarget.selectionStart = 0;
                event.currentTarget.selectionEnd = 0;
            } else if (cursorCategoryIndex === 0 && cursorEmojiIndex < EMOJI_PER_ROW) {
                resetCursorPosition();
                event.currentTarget.selectionStart = value.length;
                event.currentTarget.selectionEnd = value.length;
                focus();
            } else {
                onKeyDown(NavigationDirection.PreviousEmojiRow);
            }
            break;
        case KeyCodes.DOWN[0]:
            event.stopPropagation();
            event.preventDefault();
            if (event.shiftKey) {
                event.currentTarget.selectionEnd = value.length;
            } else if (value && event.currentTarget.selectionStart === 0) {
                event.currentTarget.selectionStart = value.length;
                event.currentTarget.selectionEnd = value.length;
            } else {
                onKeyDown(NavigationDirection.NextEmojiRow);
            }
            break;
        case KeyCodes.ENTER[0]: {
            event.stopPropagation();
            event.preventDefault();
            onEnter();
            break;
        }
        }
    };
    return (
        <div className='emoji-picker__text-container'>
            <span className='icon-magnify icon emoji-picker__search-icon'/>
            <input
                ref={ref}
                id='emojiPickerSearch'
                aria-label={formatMessage({id: 'emoji_picker.search_emoji', defaultMessage: 'Search for an emoji'})}
                className='emoji-picker__search'
                data-testid='emojiInputSearch'
                type='text'
                onChange={handleChange}
                onKeyDown={handleKeyDown}
                autoComplete='off'
                placeholder={formatMessage({id: 'emoji_picker.search', defaultMessage: 'Search emojis'})}
                value={value}
            />
        </div>
    );
},
);
EmojiPickerSearch.displayName = 'EmojiPickerSearch';
export default memo(EmojiPickerSearch);