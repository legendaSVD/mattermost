import type {CustomEmoji, Emoji, SystemEmoji} from '@mattermost/types/emojis';
import {EmojiIndicesByAlias, EmojiIndicesByUnicode, Emojis} from 'utils/emoji';
export default class EmojiMap {
    public customEmojis: Map<string, CustomEmoji>;
    private customEmojisArray: Array<[string, CustomEmoji]>;
    constructor(customEmojis: Map<string, CustomEmoji>) {
        this.customEmojis = customEmojis;
        this.customEmojisArray = [...customEmojis];
    }
    has(name: string): boolean {
        return EmojiIndicesByAlias.has(name) || this.customEmojis.has(name);
    }
    hasSystemEmoji(name: string): boolean {
        return EmojiIndicesByAlias.has(name);
    }
    hasUnicode(codepoint: string): boolean {
        return EmojiIndicesByUnicode.has(codepoint);
    }
    get(name: string): Emoji | undefined {
        if (EmojiIndicesByAlias.has(name)) {
            return Emojis[EmojiIndicesByAlias.get(name) as number];
        }
        return this.customEmojis.get(name);
    }
    getUnicode(codepoint: string): SystemEmoji | undefined {
        return Emojis[EmojiIndicesByUnicode.get(codepoint) as number];
    }
    [Symbol.iterator](): Iterator<[string, Emoji]> {
        const customEmojisArray = this.customEmojisArray;
        let systemIndex = 0;
        let customIndex = 0;
        return {
            next(): IteratorResult<[string, Emoji]> {
                if (systemIndex < Emojis.length) {
                    const systemEmoji = Emojis[systemIndex] as SystemEmoji;
                    systemIndex += 1;
                    return {value: [systemEmoji.short_names[0], systemEmoji]};
                }
                if (customIndex < customEmojisArray.length) {
                    const customEmoji = customEmojisArray[customIndex][1] as CustomEmoji;
                    customIndex += 1;
                    return {value: [customEmoji.name, customEmoji]};
                }
                return {done: true, value: undefined};
            },
        };
    }
}