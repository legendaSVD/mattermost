import emojiRegex from 'emoji-regex';
import React from 'react';
import type {Emoji, SystemEmoji} from '@mattermost/types/emojis';
import {EmojiIndicesByUnicode, Emojis} from 'utils/emoji';
const defaultRule = (aName: string, bName: string, emojiA: Emoji, emojiB: Emoji) => {
    if (emojiA.category === 'custom' && emojiB.category !== 'custom') {
        return 1;
    } else if (emojiB.category === 'custom' && emojiA.category !== 'custom') {
        return -1;
    }
    return aName.localeCompare(bName);
};
const thumbsDownRule = (otherName: string) => {
    if (otherName === 'thumbsup' || otherName === '+1') {
        return 1;
    }
    return 0;
};
const thumbsUpRule = (otherName: string) => {
    if (otherName === 'thumbsdown' || otherName === '-1') {
        return -1;
    }
    return 0;
};
const customRules: Record<string, (emojiName: string) => number> = {
    thumbsdown: thumbsDownRule,
    '-1': thumbsDownRule,
    thumbsup: thumbsUpRule,
    '+1': thumbsUpRule,
};
const getEmojiName = (emoji: Emoji, searchedName: string) => {
    if (!emoji) {
        return '';
    }
    if (searchedName && 'short_names' in emoji) {
        return emoji.short_names.find((alias: string) => alias.startsWith(searchedName)) || emoji.short_name;
    }
    return 'short_name' in emoji ? emoji.short_name : emoji.name;
};
export function compareEmojis(emojiA: Emoji, emojiB: Emoji, searchedName: string) {
    const aName = getEmojiName(emojiA, searchedName);
    const bName = getEmojiName(emojiB, searchedName);
    const aPrefix = aName.startsWith(searchedName);
    const bPrefix = bName.startsWith(searchedName);
    if (aPrefix === bPrefix) {
        if (aName in customRules) {
            return customRules[aName](bName) || defaultRule(aName, bName, emojiA, emojiB);
        }
        return defaultRule(aName, bName, emojiA, emojiB);
    } else if (aPrefix) {
        return -1;
    }
    return 1;
}
export function wrapEmojis(text: string): React.ReactNode {
    const nodes = [];
    let lastIndex = 0;
    for (const match of text.matchAll(emojiRegex())) {
        const emoji = match[0];
        const index = match.index!;
        if (match.index !== lastIndex) {
            nodes.push(text.substring(lastIndex, index));
        }
        nodes.push(
            <span
                key={index}
                className='emoji'
            >
                {emoji}
            </span>,
        );
        lastIndex = index + emoji.length;
    }
    if (lastIndex < text.length) {
        nodes.push(text.substring(lastIndex));
    }
    return nodes.length === 1 ? nodes[0] : nodes;
}
export function convertEmojiSkinTone(emoji: SystemEmoji, newSkinTone: string): SystemEmoji {
    let newEmojiId = '';
    if (!emoji.skins && !emoji.skin_variations) {
        return emoji;
    }
    if (emoji.skins && emoji.skins.length > 1) {
        return emoji;
    }
    const currentSkinTone = getSkin(emoji);
    if (currentSkinTone === 'default') {
        const variation = Object.keys(emoji?.skin_variations).find((skinVariation) => skinVariation.includes(newSkinTone));
        newEmojiId = variation ? emoji.skin_variations[variation].unified : emoji.unified;
    } else if (newSkinTone === 'default') {
        newEmojiId = emoji.unified.replaceAll(/-(1F3FB|1F3FC|1F3FD|1F3FE|1F3FF)/g, '');
    } else {
        newEmojiId = emoji.unified.replaceAll(/(1F3FB|1F3FC|1F3FD|1F3FE|1F3FF)/g, newSkinTone);
    }
    let emojiIndex = EmojiIndicesByUnicode.get(newEmojiId.toLowerCase()) as number;
    let newEmoji = Emojis[emojiIndex];
    if (!newEmoji) {
        emojiIndex = EmojiIndicesByUnicode.get(newEmojiId.toLowerCase() + '-fe0f') as number;
        newEmoji = Emojis[emojiIndex];
    }
    return newEmoji ?? emoji;
}
export function getSkin(emoji: Emoji) {
    if ('skin_variations' in emoji) {
        return 'default';
    }
    if ('skins' in emoji) {
        const skin = emoji?.skins?.[0] ?? '';
        if (skin.length !== 0) {
            return skin;
        }
    }
    return null;
}
export function unifiedToUnicode(unified: string): string {
    return unified.split('-').map((cp) => String.fromCodePoint(parseInt(cp, 16))).join('');
}
export function trimmedEmojiName(emojiName: string) {
    return emojiName.startsWith(':') && emojiName.endsWith(':') ? emojiName.slice(1, -1) : emojiName;
}
export function emojiMatchesSkin(emoji: Emoji, skin: string) {
    const emojiSkin = getSkin(emoji);
    return !emojiSkin || emojiSkin === skin;
}