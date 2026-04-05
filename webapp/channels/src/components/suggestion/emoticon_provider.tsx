import React from 'react';
import {defineMessage} from 'react-intl';
import type {Emoji, SystemEmoji} from '@mattermost/types/emojis';
import {autocompleteCustomEmojis} from 'mattermost-redux/actions/emojis';
import {getEmojiImageUrl, isSystemEmoji} from 'mattermost-redux/utils/emoji_utils';
import {getEmojiMap, getRecentEmojisNames} from 'selectors/emojis';
import store from 'stores/redux_store';
import {compareEmojis, emojiMatchesSkin, unifiedToUnicode} from 'utils/emoji_utils';
import * as Emoticons from 'utils/emoticons';
import Provider from './provider';
import type {ResultsCallback} from './provider';
import {SuggestionContainer} from './suggestion';
import type {SuggestionProps} from './suggestion';
export const MIN_EMOTICON_LENGTH = 2;
export const EMOJI_CATEGORY_SUGGESTION_BLOCKLIST = ['skintone'];
type EmojiItem = {
    emoji: Emoji;
    name: string;
}
const EmoticonSuggestion = React.forwardRef<HTMLLIElement, SuggestionProps<EmojiItem>>((props, ref) => {
    const displayName = ':' + props.item.name + ':';
    const emoji = props.item.emoji;
    return (
        <SuggestionContainer
            ref={ref}
            {...props}
        >
            <div className='pull-left emoticon-suggestion__image-container'>
                <img
                    className='emoticon-suggestion__image'
                    src={getEmojiImageUrl(emoji)}
                    alt=''
                />
            </div>
            <div className='pull-left'>
                {displayName}
            </div>
        </SuggestionContainer>
    );
});
EmoticonSuggestion.displayName = 'EmoticonSuggestion';
export default class EmoticonProvider extends Provider {
    constructor() {
        super();
        this.triggerCharacter = ':';
    }
    handlePretextChanged(pretext: string, resultsCallback: ResultsCallback<EmojiItem>) {
        const captured = (/(^|\s|^\+|^-)(:([^:\s]*))$/g).exec(pretext.toLowerCase());
        if (!captured) {
            return false;
        }
        const prefix = captured[1];
        const text = captured[2];
        const partialName = captured[3];
        if (partialName.length < MIN_EMOTICON_LENGTH) {
            return false;
        }
        if (prefix !== '-' && prefix !== '+') {
            for (const emoticon of Object.keys(Emoticons.emoticonPatterns)) {
                if (Emoticons.emoticonPatterns[emoticon].test(text)) {
                    return false;
                }
            }
        }
        if (store.getState().entities.general.config.EnableCustomEmoji === 'true') {
            store.dispatch(autocompleteCustomEmojis(partialName)).then(() => this.findAndSuggestEmojis(text, partialName, resultsCallback));
        } else {
            this.findAndSuggestEmojis(text, partialName, resultsCallback);
        }
        return true;
    }
    formatEmojis(emojis: EmojiItem[]) {
        return emojis.map((item) => {
            if (isSystemEmoji(item.emoji)) {
                return unifiedToUnicode((item.emoji as SystemEmoji).unified);
            }
            return ':' + item.name + ':';
        });
    }
    findAndSuggestEmojis(text: string, partialName: string, resultsCallback: ResultsCallback<EmojiItem>) {
        const recentMatched: EmojiItem[] = [];
        const matched: EmojiItem[] = [];
        const state = store.getState();
        const skintone = state.entities?.preferences?.myPreferences['emoji--emoji_skintone']?.value || 'default';
        const emojiMap = getEmojiMap(state);
        const recentEmojis = getRecentEmojisNames(state);
        for (const [name, emoji] of emojiMap) {
            if (EMOJI_CATEGORY_SUGGESTION_BLOCKLIST.includes(emoji.category)) {
                continue;
            }
            if (isSystemEmoji(emoji)) {
                for (const alias of emoji.short_names) {
                    if (alias.indexOf(partialName) !== -1) {
                        const matchedArray = recentEmojis.includes(alias) || recentEmojis.includes(name) ? recentMatched : matched;
                        if (emojiMatchesSkin(emoji, skintone)) {
                            matchedArray.push({name: alias, emoji});
                        }
                        break;
                    }
                }
            } else if (name.indexOf(partialName) !== -1) {
                if (emojiMap.hasSystemEmoji(name)) {
                    continue;
                }
                const matchedArray = recentEmojis.includes(name) ? recentMatched : matched;
                matchedArray.push({name, emoji});
            }
        }
        const sortEmojisHelper = (a: EmojiItem, b: EmojiItem) => {
            return compareEmojis(a.emoji, b.emoji, partialName);
        };
        recentMatched.sort(sortEmojisHelper);
        matched.sort(sortEmojisHelper);
        const terms = [
            ...this.formatEmojis(recentMatched),
            ...this.formatEmojis(matched),
        ];
        const items = [
            ...recentMatched,
            ...matched,
        ];
        resultsCallback({
            matchedPretext: text,
            groups: [{
                key: 'emojis',
                label: defineMessage({id: 'suggestion.emoji', defaultMessage: 'Emoji'}),
                terms,
                items,
                component: EmoticonSuggestion,
            }],
        });
    }
}