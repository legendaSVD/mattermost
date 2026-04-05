import React from 'react';
import type {PostImage, PostType} from '@mattermost/types/posts';
import type {HighlightWithoutNotificationKey} from 'mattermost-redux/selectors/entities/users';
import PostEditedIndicator from 'components/post_view/post_edited_indicator';
import type EmojiMap from 'utils/emoji_map';
import messageHtmlToComponent from 'utils/message_html_to_component';
import type {ChannelNamesMap, MentionKey, TextFormattingOptions} from 'utils/text_formatting';
import {formatText} from 'utils/text_formatting';
import type {PropsFromRedux} from './index';
export type Props = PropsFromRedux & OwnProps;
export type OwnProps = {
    options?: Partial<TextFormattingOptions>;
    proxyImages?: boolean;
    imagesMetadata?: Record<string, PostImage>;
    postId?: string;
    editedAt?: number;
    message?: string;
    channelNamesMap?: ChannelNamesMap;
    mentionKeys?: MentionKey[];
    highlightKeys?: HighlightWithoutNotificationKey[];
    imageProps?: object;
    hasPluginTooltips?: boolean;
    channelId?: string;
    postType?: PostType;
    emojiMap?: EmojiMap;
    userIds?: string[];
    messageMetadata?: Record<string, string>;
}
function Markdown({
    options = {},
    proxyImages = true,
    imagesMetadata = {},
    postId = '',
    editedAt = 0,
    message = '',
    channelNamesMap,
    mentionKeys,
    highlightKeys,
    imageProps,
    channelId,
    hasPluginTooltips,
    postType,
    emojiMap,
    userIds,
    messageMetadata,
    enableFormatting,
    siteURL,
    hasImageProxy,
    team,
    minimumHashtagLength,
    managedResourcePaths,
}: Props) {
    if (message === '' || !enableFormatting) {
        return (
            <span>
                {message}
                <PostEditedIndicator
                    postId={postId}
                    editedAt={editedAt}
                />
            </span>
        );
    }
    const inputOptions = Object.assign({
        siteURL,
        mentionKeys,
        highlightKeys,
        atMentions: true,
        channelNamesMap,
        proxyImages: hasImageProxy && proxyImages,
        team,
        minimumHashtagLength,
        managedResourcePaths,
        editedAt,
        postId,
    }, options);
    const htmlFormattedText = formatText(message, inputOptions, emojiMap);
    return messageHtmlToComponent(htmlFormattedText, {
        imageProps,
        imagesMetadata,
        hasPluginTooltips,
        postId,
        userIds,
        messageMetadata,
        channelId,
        postType,
        mentionHighlight: options?.mentionHighlight,
        disableGroupHighlight: options?.disableGroupHighlight,
        editedAt,
        atSumOfMembersMentions: options?.atSumOfMembersMentions,
        atPlanMentions: options?.atPlanMentions,
    });
}
export default Markdown;