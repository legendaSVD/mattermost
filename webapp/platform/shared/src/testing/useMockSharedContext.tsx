import React, {useCallback, useMemo} from 'react';
import {isSystemEmoji, type CustomEmoji, type Emoji, type SystemEmoji} from '@mattermost/types/emojis';
import {SharedProvider, type SharedProviderProps} from '../context/context';
const mockEmojisByName = {
    smiley: {
        name: 'SMILING FACE WITH OPEN MOUTH',
        unified: '1F603',
        short_name: 'smiley',
        short_names: [
            'smiley',
        ],
        category: 'smileys-emotion',
    } as SystemEmoji,
    'custom-emoji-1': {
        id: 'custom-emoji-id-1',
        name: 'custom-emoji-1',
        category: 'custom',
        create_at: 0,
        update_at: 0,
        delete_at: 0,
        creator_id: 'user-id-1',
    } as CustomEmoji,
};
export function useMockSharedContext({
    useEmojiByName,
    useEmojiUrl,
}: Partial<Omit<SharedProviderProps, 'children'>>) {
    const propsWithOverrides = useMemo(() => {
        return {
            useEmojiByName: useEmojiByName ?? ((name: string) => {
                if (!Object.hasOwn(mockEmojisByName, name)) {
                    return undefined;
                }
                return mockEmojisByName[name as keyof typeof mockEmojisByName];
            }),
            useEmojiUrl: useEmojiUrl ?? ((emoji?: Emoji) => {
                if (!emoji) {
                    return '';
                }
                if (isSystemEmoji(emoji)) {
                    return `https:
                }
                return `https:
            }),
        };
    }, [useEmojiByName, useEmojiUrl]);
    const SharedContextProvider = useCallback(({children}: Pick<SharedProviderProps, 'children'>) => {
        return (
            <SharedProvider {...propsWithOverrides}>
                {children}
            </SharedProvider>
        );
    }, [propsWithOverrides]);
    return {SharedContextProvider};
}