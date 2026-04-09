import React, {useMemo} from 'react';
import type {Emoji} from '@mattermost/types/emojis';
export interface SharedContextValue {
    useEmojiByName: (name: string) => Emoji | undefined;
    useEmojiUrl: (emoji?: Emoji) => string;
}
declare global {
    interface Window {
        __MATTERMOST_SHARED_CONTEXT__: React.Context<SharedContextValue> | undefined;
    }
}
export const SharedContext = window?.__MATTERMOST_SHARED_CONTEXT__ ?? (
    window.__MATTERMOST_SHARED_CONTEXT__ = React.createContext<SharedContextValue>(
        null as unknown as SharedContextValue,
    )
);
SharedContext.displayName = 'MattermostSharedContext';
export interface SharedProviderProps extends SharedContextValue {
    children?: React.ReactNode;
}
export function SharedProvider({
    children,
    useEmojiByName,
    useEmojiUrl,
}: SharedProviderProps) {
    const contextValue = useMemo(() => ({
        useEmojiByName,
        useEmojiUrl,
    }), [useEmojiByName, useEmojiUrl]);
    return <SharedContext.Provider value={contextValue}>{children}</SharedContext.Provider>;
}