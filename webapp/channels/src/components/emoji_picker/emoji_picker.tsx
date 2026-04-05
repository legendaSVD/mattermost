import throttle from 'lodash/throttle';
import React, {useRef, useState, useEffect, useCallback, memo, useMemo} from 'react';
import {FormattedMessage} from 'react-intl';
import type {FixedSizeList} from 'react-window';
import type InfiniteLoader from 'react-window-infinite-loader';
import type {Emoji, EmojiCategory} from '@mattermost/types/emojis';
import {getEmojiName} from 'mattermost-redux/utils/emoji_utils';
import EmojiPickerCategories from 'components/emoji_picker/components/emoji_picker_categories';
import EmojiPickerCurrentResults from 'components/emoji_picker/components/emoji_picker_current_results';
import EmojiPickerCustomEmojiButton from 'components/emoji_picker/components/emoji_picker_custom_emoji_button';
import EmojiPickerPreview from 'components/emoji_picker/components/emoji_picker_preview';
import EmojiPickerSearch from 'components/emoji_picker/components/emoji_picker_search';
import EmojiPickerSkin from 'components/emoji_picker/components/emoji_picker_skin';
import {
    CATEGORIES,
    RECENT_EMOJI_CATEGORY,
    RECENT,
    SMILEY_EMOTION,
    SEARCH_RESULTS,
    EMOJI_PER_ROW,
    CUSTOM_EMOJI_SEARCH_THROTTLE_TIME_MS,
    EMOJI_CONTAINER_HEIGHT,
    CATEGORIES_CONTAINER_HEIGHT,
} from 'components/emoji_picker/constants';
import {NavigationDirection} from 'components/emoji_picker/types';
import type {CategoryOrEmojiRow, Categories, EmojiCursor, EmojiPosition, EmojiRow} from 'components/emoji_picker/types';
import {createCategoryAndEmojiRows, getCursorProperties, getUpdatedCategoriesAndAllEmojis} from 'components/emoji_picker/utils';
import NoResultsIndicator from 'components/no_results_indicator';
import {NoResultsVariant} from 'components/no_results_indicator/types';
import type {PropsFromRedux} from './index';
export interface Props extends PropsFromRedux {
    filter: string;
    onEmojiClick: (emoji: Emoji) => void;
    handleFilterChange: (filter: string) => void;
    handleEmojiPickerClose: () => void;
    onAddCustomEmojiClick?: () => void;
}
const EmojiPicker = ({
    filter,
    onEmojiClick,
    handleFilterChange,
    handleEmojiPickerClose,
    onAddCustomEmojiClick,
    customEmojisEnabled = false,
    customEmojiPage = 0,
    emojiMap,
    recentEmojis,
    userSkinTone,
    currentTeamName,
    actions: {
        getCustomEmojis,
        searchCustomEmojis,
        incrementEmojiPickerPage,
        setUserSkinTone,
    },
}: Props) => {
    const getInitialActiveCategory = () => (recentEmojis.length ? RECENT : SMILEY_EMOTION);
    const [activeCategory, setActiveCategory] = useState<EmojiCategory>(getInitialActiveCategory);
    const [cursor, setCursor] = useState<EmojiCursor>({
        rowIndex: -1,
        emojiId: '',
        emoji: undefined,
    });
    const getInitialCategories = () => (recentEmojis.length ? {...RECENT_EMOJI_CATEGORY, ...CATEGORIES} : CATEGORIES);
    const [categories, setCategories] = useState<Categories>(getInitialCategories);
    const [allEmojis, setAllEmojis] = useState<Record<string, Emoji>>({});
    const [categoryOrEmojisRows, setCategoryOrEmojisRows] = useState<CategoryOrEmojiRow[]>([]);
    const [emojiPositions, setEmojiPositionsArray] = useState<EmojiPosition[]>([]);
    const searchInputRef = useRef<HTMLInputElement>(null);
    const infiniteLoaderRef = React.useRef<InfiniteLoader & {_listRef: FixedSizeList<CategoryOrEmojiRow[]>}>(null);
    const shouldRunCreateCategoryAndEmojiRows = useRef<boolean>();
    const throttledSearchCustomEmoji = useRef(throttle((newFilter, customEmojisEnabled) => {
        if (customEmojisEnabled && newFilter && newFilter.trim().length) {
            searchCustomEmojis(newFilter);
        }
    }, CUSTOM_EMOJI_SEARCH_THROTTLE_TIME_MS));
    useEffect(() => {
        const searchFocusAnimationFrame = window.requestAnimationFrame(() => {
            searchInputRef.current?.focus();
        });
        const rootComponent = document.getElementById('root');
        rootComponent?.classList.add('emoji-picker--active');
        return () => {
            rootComponent?.classList.remove('emoji-picker--active');
            window.cancelAnimationFrame(searchFocusAnimationFrame);
        };
    }, []);
    useEffect(() => {
        shouldRunCreateCategoryAndEmojiRows.current = true;
        const [updatedCategories, updatedAllEmojis] = getUpdatedCategoriesAndAllEmojis(emojiMap, recentEmojis, userSkinTone, allEmojis);
        setAllEmojis(updatedAllEmojis);
        setCategories(updatedCategories);
    }, [emojiMap, userSkinTone, recentEmojis]);
    useEffect(() => {
        shouldRunCreateCategoryAndEmojiRows.current = false;
        const [updatedCategoryOrEmojisRows, updatedEmojiPositions] = createCategoryAndEmojiRows(allEmojis, categories, filter, userSkinTone);
        if (activeCategory !== 'custom') {
            selectFirstEmoji(updatedEmojiPositions);
        }
        setCategoryOrEmojisRows(updatedCategoryOrEmojisRows);
        setEmojiPositionsArray(updatedEmojiPositions);
        throttledSearchCustomEmoji.current(filter, customEmojisEnabled);
    }, [filter, shouldRunCreateCategoryAndEmojiRows.current, customEmojisEnabled]);
    useEffect(() => {
        searchInputRef.current?.focus();
    }, []);
    useEffect(() => {
        if (activeCategory !== getInitialActiveCategory()) {
            setActiveCategory(getInitialActiveCategory());
        }
        infiniteLoaderRef?.current?._listRef?.scrollToItem(0, 'start');
    }, [filter]);
    const focusOnSearchInput = useCallback(() => {
        searchInputRef.current?.focus();
    }, []);
    const getEmojiById = (emojiId: string) => {
        if (!emojiId) {
            return null;
        }
        const emoji = allEmojis[emojiId] || allEmojis[emojiId.toUpperCase()] || allEmojis[emojiId.toLowerCase()];
        return emoji;
    };
    const selectFirstEmoji = (emojiPositions: EmojiPosition[]) => {
        if (!emojiPositions[0]) {
            return;
        }
        const {rowIndex, emojiId} = emojiPositions[0];
        const cursorEmoji = getEmojiById(emojiId);
        if (cursorEmoji) {
            setCursor({
                rowIndex,
                emojiId,
                emoji: cursorEmoji,
            });
        }
    };
    const handleCategoryClick = useCallback((categoryRowIndex: CategoryOrEmojiRow['index'], categoryName: EmojiCategory, emojiId: string) => {
        if (!categoryName || categoryName === activeCategory || !emojiId) {
            return;
        }
        setActiveCategory(categoryName);
        infiniteLoaderRef?.current?._listRef?.scrollToItem(categoryRowIndex, 'start');
        const cursorEmoji = getEmojiById(emojiId);
        if (cursorEmoji) {
            setCursor({
                rowIndex: categoryRowIndex + 1,
                emojiId,
                emoji: cursorEmoji,
            });
        }
    }, [activeCategory]);
    const resetCursor = useCallback(() => {
        setCursor({
            rowIndex: -1,
            emojiId: '',
            emoji: undefined,
        });
        infiniteLoaderRef.current?._listRef?.scrollTo(0);
    }, []);
    const onAddCustomEmojiClickInner = useCallback(() => {
        handleEmojiPickerClose();
        onAddCustomEmojiClick?.();
    }, []);
    const [cursorCategory, cursorCategoryIndex, cursorEmojiIndex] = getCursorProperties(cursor.rowIndex, cursor.emojiId, categoryOrEmojisRows as EmojiRow[]);
    function calculateNewCursorForUpArrow(cursorCategory: string, emojiPositions: EmojiPosition[], currentCursorsPositionIndex: number, categories: Categories, focusOnSearchInput: () => void) {
        if ((currentCursorsPositionIndex - EMOJI_PER_ROW) >= 0) {
            const upTheRowCategoryName = emojiPositions[currentCursorsPositionIndex - EMOJI_PER_ROW].categoryName as EmojiCategory;
            if (upTheRowCategoryName !== cursorCategory) {
                const upTheRowCategorysEmojis = categories[upTheRowCategoryName].emojiIds || [];
                const lastEmojiIdUpTheRow = upTheRowCategorysEmojis[upTheRowCategorysEmojis.length - 1];
                const lastEmojiPositionUpTheRow = emojiPositions.find((emojiPosition) => {
                    return emojiPosition.emojiId.toLowerCase() === lastEmojiIdUpTheRow.toLowerCase() && emojiPosition.categoryName === upTheRowCategoryName;
                });
                return lastEmojiPositionUpTheRow;
            }
            return emojiPositions[currentCursorsPositionIndex - EMOJI_PER_ROW];
        }
        const startingEmojisOfDifferentCategory = emojiPositions.slice(0, currentCursorsPositionIndex).reverse().find((emojiPosition) => {
            return emojiPosition.categoryName !== cursorCategory;
        });
        if (startingEmojisOfDifferentCategory) {
            return startingEmojisOfDifferentCategory;
        }
        focusOnSearchInput();
        return undefined;
    }
    function calculateNewCursorForRightOrLeftArrow(moveTo: NavigationDirection, emojiPositions: EmojiPosition[], currentCursorIndexInEmojis: number, focusOnSearchInput: () => void) {
        if (moveTo === NavigationDirection.NextEmoji && ((currentCursorIndexInEmojis + 1) < emojiPositions.length)) {
            return emojiPositions[currentCursorIndexInEmojis + 1];
        }
        if (moveTo === NavigationDirection.PreviousEmoji && ((currentCursorIndexInEmojis - 1) >= 0)) {
            return emojiPositions[currentCursorIndexInEmojis - 1];
        }
        if (moveTo === NavigationDirection.PreviousEmoji && ((currentCursorIndexInEmojis - 1) < 0)) {
            focusOnSearchInput();
            return undefined;
        }
        return undefined;
    }
    function calculateNewCursorForDownArrow(cursorCategory: string, emojiPositions: EmojiPosition[], currentCursorsPositionIndex: number, categories: Categories) {
        if ((currentCursorsPositionIndex + EMOJI_PER_ROW) < emojiPositions.length) {
            const downTheRowCategoryName = emojiPositions[currentCursorsPositionIndex + EMOJI_PER_ROW].categoryName as EmojiCategory;
            if (downTheRowCategoryName !== cursorCategory) {
                const downTheRowCategorysEmojis = categories[downTheRowCategoryName].emojiIds || [];
                const firstEmojiIdDownTheRow = downTheRowCategorysEmojis[0];
                const firstEmojiPositionDownTheRow = emojiPositions.find((emojiPosition) => {
                    return emojiPosition.emojiId.toLowerCase() === firstEmojiIdDownTheRow.toLowerCase() && emojiPosition.categoryName === downTheRowCategoryName;
                });
                return firstEmojiPositionDownTheRow;
            }
            return emojiPositions[currentCursorsPositionIndex + EMOJI_PER_ROW];
        }
        const endingEmojisOfDifferentCategory = emojiPositions.slice(currentCursorsPositionIndex + 1, emojiPositions.length).find((emojiPosition) => {
            return emojiPosition.categoryName !== cursorCategory;
        });
        if (endingEmojisOfDifferentCategory) {
            return endingEmojisOfDifferentCategory;
        }
        return undefined;
    }
    const handleKeyboardEmojiNavigation = (moveTo: NavigationDirection) => {
        if (emojiPositions.length === 0) {
            return;
        }
        let newCursor;
        if (cursor.emojiId.length !== 0 && cursor.rowIndex !== -1) {
            const currentCursorsPositionIndex = emojiPositions.findIndex((emojiPosition) =>
                emojiPosition.rowIndex === cursor.rowIndex && emojiPosition.emojiId.toLowerCase() === cursor.emojiId.toLowerCase());
            if (currentCursorsPositionIndex === -1) {
                newCursor = undefined;
            } else if (moveTo === NavigationDirection.NextEmoji || moveTo === NavigationDirection.PreviousEmoji) {
                newCursor = calculateNewCursorForRightOrLeftArrow(moveTo, emojiPositions, currentCursorsPositionIndex, focusOnSearchInput);
            } else if (moveTo === NavigationDirection.NextEmojiRow) {
                newCursor = calculateNewCursorForDownArrow(cursorCategory, emojiPositions, currentCursorsPositionIndex, categories);
            } else if (moveTo === NavigationDirection.PreviousEmojiRow) {
                newCursor = calculateNewCursorForUpArrow(cursorCategory, emojiPositions, currentCursorsPositionIndex, categories, focusOnSearchInput);
            }
        } else if (cursor.emojiId.length === 0 && cursor.rowIndex === -1) {
            if (moveTo === NavigationDirection.NextEmoji || moveTo === NavigationDirection.NextEmojiRow) {
                if (emojiPositions.length !== 0) {
                    newCursor = emojiPositions[0];
                }
            }
        }
        if (newCursor === undefined) {
            return;
        }
        const newCursorEmoji = getEmojiById(newCursor.emojiId);
        if (!newCursorEmoji) {
            return;
        }
        searchInputRef.current?.setAttribute('aria-activedescendant', newCursorEmoji.name.toLocaleLowerCase().replaceAll(' ', '_'));
        setCursor({
            rowIndex: newCursor.rowIndex,
            emojiId: newCursor.emojiId,
            emoji: newCursorEmoji,
        });
        infiniteLoaderRef?.current?._listRef?.scrollToItem(newCursor.rowIndex, 'auto');
    };
    const handleEnterOnEmoji = useCallback(() => {
        const clickedEmoji = cursor.emoji;
        if (clickedEmoji) {
            onEmojiClick(clickedEmoji);
        }
    }, [cursor.emojiId]);
    const handleEmojiOnMouseOver = (mouseOverCursor: EmojiCursor) => {
        if (mouseOverCursor.emojiId !== cursor.emojiId || cursor.emojiId === '') {
            setCursor(mouseOverCursor);
        }
    };
    const cursorEmojiName = useMemo(() => {
        const {emoji} = cursor;
        if (!emoji) {
            return '';
        }
        const name = getEmojiName(emoji);
        return name.replace(/_/g, ' ');
    }, [cursor.emojiId]);
    const areSearchResultsEmpty = filter.length !== 0 && categoryOrEmojisRows.length === 1 && categoryOrEmojisRows?.[0]?.items?.[0]?.categoryName === SEARCH_RESULTS;
    return (
        <>
            <div
                aria-live='assertive'
                className='sr-only'
            >
                <FormattedMessage
                    id='emoji_picker_item.emoji_aria_label'
                    defaultMessage='{emojiName} emoji'
                    values={{
                        emojiName: cursorEmojiName,
                    }}
                />
            </div>
            <div className='emoji-picker__search-container'>
                <EmojiPickerSearch
                    ref={searchInputRef}
                    value={filter}
                    cursorCategoryIndex={cursorCategoryIndex}
                    cursorEmojiIndex={cursorEmojiIndex}
                    focus={focusOnSearchInput}
                    onEnter={handleEnterOnEmoji}
                    onChange={handleFilterChange}
                    onKeyDown={handleKeyboardEmojiNavigation}
                    resetCursorPosition={resetCursor}
                />
                <EmojiPickerSkin
                    userSkinTone={userSkinTone}
                    onSkinSelected={setUserSkinTone}
                />
            </div>
            {filter.length === 0 && (
                <EmojiPickerCategories
                    isFiltering={filter.length > 0}
                    active={activeCategory}
                    categories={categories}
                    onClick={handleCategoryClick}
                    onKeyDown={handleKeyboardEmojiNavigation}
                    focusOnSearchInput={focusOnSearchInput}
                />
            )}
            {areSearchResultsEmpty ? (
                <div
                    className='emoji-picker__items'
                    style={{height: EMOJI_CONTAINER_HEIGHT + CATEGORIES_CONTAINER_HEIGHT}}
                >
                    <NoResultsIndicator
                        variant={NoResultsVariant.Search}
                        titleValues={{channelName: `${filter}`}}
                    />
                </div>
            ) : (
                <EmojiPickerCurrentResults
                    ref={infiniteLoaderRef}
                    isFiltering={filter.length > 0}
                    activeCategory={activeCategory}
                    categoryOrEmojisRows={categoryOrEmojisRows}
                    cursorEmojiId={cursor.emojiId}
                    cursorRowIndex={cursor.rowIndex}
                    setActiveCategory={setActiveCategory}
                    onEmojiClick={onEmojiClick}
                    onEmojiMouseOver={handleEmojiOnMouseOver}
                    getCustomEmojis={getCustomEmojis}
                    customEmojiPage={customEmojiPage}
                    incrementEmojiPickerPage={incrementEmojiPickerPage}
                    customEmojisEnabled={customEmojisEnabled}
                />
            )}
            <div className='emoji-picker__footer'>
                {areSearchResultsEmpty ? <div/> : <EmojiPickerPreview emoji={cursor.emoji}/>}
                <EmojiPickerCustomEmojiButton
                    currentTeamName={currentTeamName}
                    customEmojisEnabled={customEmojisEnabled}
                    onClick={onAddCustomEmojiClickInner}
                />
            </div>
        </>
    );
};
export default memo(EmojiPicker);