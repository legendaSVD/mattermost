import {Parser, ProcessNodeDefinitions} from 'html-to-react';
import type {AllHTMLAttributes} from 'react';
import React from 'react';
import AtMention from 'components/at_mention';
import AtPlanMention from 'components/at_plan_mention';
import AtSumOfMembersMention from 'components/at_sum_members_mention';
import CodeBlock from 'components/code_block/code_block';
import InlineEntityLink from 'components/inline_entity_link';
import LatexBlock from 'components/latex_block';
import LatexInline from 'components/latex_inline';
import MarkdownImage from 'components/markdown_image';
import PluginLinkTooltip from 'components/plugin_link_tooltip';
import PostEmoji from 'components/post_emoji';
import PostEditedIndicator from 'components/post_view/post_edited_indicator';
export type Options = Partial<{
    postId: string;
    editedAt: number;
    hasPluginTooltips: boolean;
    mentions: boolean;
    mentionHighlight: boolean;
    disableGroupHighlight: boolean;
    markdown: boolean;
    latex: boolean;
    inlinelatex: boolean;
    postType: string;
    imageProps: {[key: string]: any};
    atSumOfMembersMentions: boolean;
    userIds: string[];
    imagesMetadata: any;
    emoji: boolean;
    messageMetadata: any;
    images: boolean;
    atPlanMentions: boolean;
    channelId: string;
    channelIsShared: boolean;
    fetchMissingUsers: boolean;
}>
type ProcessingInstruction = {
    replaceChildren: boolean;
    shouldProcessNode: (node: any) => boolean;
    processNode: (node: any, children?: any, index?: number) => any;
}
export default function messageHtmlToComponent(html: string, options: Options = {}) {
    if (!html) {
        return null;
    }
    const parser = new (Parser as any)();
    const processNodeDefinitions = new (ProcessNodeDefinitions as any)();
    function isValidNode() {
        return true;
    }
    const processingInstructions: ProcessingInstruction[] = [
        {
            replaceChildren: false,
            shouldProcessNode: (node: any) => node.type === 'tag' && node.name === 'input' && node.attribs.type === 'checkbox',
            processNode: (node: any) => {
                const attribs = node.attribs || {};
                node.attribs.checked = Boolean(attribs.checked);
                return React.createElement('input', {...node.attribs});
            },
        },
        {
            replaceChildren: false,
            shouldProcessNode: (node: any) => node.type === 'tag' && node.name === 'span' && node.attribs['data-edited-post-id'] && node.attribs['data-edited-post-id'] === options.postId,
            processNode: () => {
                return options.postId && options.editedAt && options.editedAt > 0 ? (
                    <React.Fragment key={`edited-${options.postId}`}>
                        {' '}
                        <PostEditedIndicator
                            postId={options.postId}
                            editedAt={options.editedAt}
                        />
                    </React.Fragment>
                ) : null;
            },
        },
    ];
    processingInstructions.push({
        replaceChildren: false,
        shouldProcessNode: (node: any) => {
            if (node.type !== 'tag' || node.name !== 'a' || !node.attribs.href) {
                return false;
            }
            const url = node.attribs.href;
            try {
                const urlObj = new URL(url, 'http://mattermost.com');
                return urlObj.searchParams.get('view') === 'citation';
            } catch (e) {
                return false;
            }
        },
        processNode: (node: any, children: any, index?: number) => {
            return (
                <InlineEntityLink
                    key={`inline-entity-${index}`}
                    url={node.attribs.href}
                    text={children}
                />
            );
        },
    });
    if (options.hasPluginTooltips) {
        processingInstructions.push({
            replaceChildren: false,
            shouldProcessNode: (node: any) => node.type === 'tag' && node.name === 'a' && node.attribs.href,
            processNode: (node: any, children: any) => {
                return (
                    <PluginLinkTooltip nodeAttributes={convertPropsToReactStandard(node.attribs)}>
                        {children}
                    </PluginLinkTooltip>
                );
            },
        });
    }
    if (!('mentions' in options) || options.mentions) {
        const mentionHighlight = 'mentionHighlight' in options ? options.mentionHighlight : true;
        const disableGroupHighlight = 'disableGroupHighlight' in options ? options.disableGroupHighlight === true : false;
        const mentionAttrib = 'data-mention';
        processingInstructions.push({
            replaceChildren: true,
            shouldProcessNode: (node) => node.attribs && node.attribs[mentionAttrib],
            processNode: (node: any, children: any) => {
                const mentionName = node.attribs[mentionAttrib];
                const callAtMention = (
                    <AtMention
                        mentionName={mentionName}
                        disableHighlight={!mentionHighlight}
                        disableGroupHighlight={disableGroupHighlight}
                        channelId={options.channelId}
                        fetchMissingUsers={options.fetchMissingUsers}
                    >
                        {children}
                    </AtMention>
                );
                return callAtMention;
            },
        });
    }
    if (options.atSumOfMembersMentions) {
        const mentionAttrib = 'data-sum-of-members-mention';
        processingInstructions.push({
            replaceChildren: true,
            shouldProcessNode: (node: any) => node.attribs && node.attribs[mentionAttrib],
            processNode: (node: any) => {
                const mentionName = node.attribs[mentionAttrib];
                const sumOfMembersMention = (
                    <AtSumOfMembersMention
                        postId={options.postId || ''}
                        userIds={options.userIds || []}
                        messageMetadata={options.messageMetadata}
                        text={mentionName}
                    />);
                return sumOfMembersMention;
            },
        });
    }
    if (options.atPlanMentions) {
        const mentionAttrib = 'data-plan-mention';
        processingInstructions.push({
            replaceChildren: true,
            shouldProcessNode: (node: any) => node.attribs && node.attribs[mentionAttrib],
            processNode: (node: any) => {
                const mentionName = node.attribs[mentionAttrib];
                const sumOfMembersMention = (
                    <AtPlanMention
                        plan={mentionName}
                    />);
                return sumOfMembersMention;
            },
        });
    }
    if (!('emoji' in options) || options.emoji) {
        const emojiAttrib = 'data-emoticon';
        processingInstructions.push({
            replaceChildren: true,
            shouldProcessNode: (node: any) => node.attribs && node.attribs[emojiAttrib],
            processNode: (node: any, children: any) => {
                const emojiName = node.attribs[emojiAttrib];
                return <PostEmoji name={emojiName}>{children}</PostEmoji>;
            },
        });
    }
    if (!('images' in options) || options.images) {
        processingInstructions.push({
            replaceChildren: false,
            shouldProcessNode: (node: any) => node.type === 'tag' && node.name === 'img',
            processNode: (node: any) => {
                const {
                    class: className,
                    ...attribs
                } = node.attribs;
                const imageIsLink = (parentNode: any) => {
                    if (parentNode &&
                        parentNode.type === 'tag' &&
                        parentNode.name === 'a'
                    ) {
                        return true;
                    }
                    return false;
                };
                return (
                    <MarkdownImage
                        className={className}
                        imageMetadata={options.imagesMetadata && options.imagesMetadata[attribs.src]}
                        {...attribs}
                        {...options.imageProps}
                        postId={options.postId}
                        imageIsLink={imageIsLink(node.parentNode)}
                        postType={options.postType}
                    />
                );
            },
        });
    }
    if (!('latex' in options) || options.latex) {
        processingInstructions.push({
            replaceChildren: false,
            shouldProcessNode: (node: any) => node.attribs && node.attribs['data-latex'],
            processNode: (node: any) => {
                return (
                    <LatexBlock
                        key={node.attribs['data-latex']}
                        content={node.attribs['data-latex']}
                    />
                );
            },
        });
    }
    if (!('inlinelatex' in options) || options.inlinelatex) {
        processingInstructions.push({
            replaceChildren: false,
            shouldProcessNode: (node) => node.attribs && node.attribs['data-inline-latex'],
            processNode: (node: any) => {
                return (
                    <LatexInline content={node.attribs['data-inline-latex']}/>
                );
            },
        });
    }
    if (!('markdown' in options) || options.markdown) {
        processingInstructions.push({
            replaceChildren: false,
            shouldProcessNode: (node) => node.attribs && node.attribs['data-codeblock-code'],
            processNode: (node: any) => {
                return (
                    <CodeBlock
                        key={node.attribs['data-codeblock-code']}
                        code={node.attribs['data-codeblock-code']}
                        language={node.attribs['data-codeblock-language']}
                        searchedContent={node.attribs['data-codeblock-searchedcontent']}
                        channelId={options.channelId}
                    />
                );
            },
        });
    }
    processingInstructions.push({
        replaceChildren: false,
        shouldProcessNode: () => true,
        processNode: processNodeDefinitions.processDefaultNode as (node: any, children?: any, index?: number) => any,
    });
    return parser.parseWithInstructions(html, isValidNode, processingInstructions);
}
export function convertPropsToReactStandard(propsToConvert: AllHTMLAttributes<HTMLElement>): Record<string, unknown> {
    const newProps: Record<string, unknown> = {};
    for (const [key, value] of Object.entries(propsToConvert)) {
        switch (key) {
        case 'class':
            newProps.className = value;
            break;
        case 'for':
            newProps.htmlFor = value;
            break;
        case 'tabindex':
            newProps.tabIndex = value;
            break;
        case 'readonly':
            newProps.readOnly = value;
            break;
        default:
            newProps[key] = value;
        }
    }
    return newProps;
}