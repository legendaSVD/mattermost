import emojiRegex from 'emoji-regex';
import type {Renderer} from 'marked';
import type {SystemEmoji} from '@mattermost/types/emojis';
import {isRecordOf} from '@mattermost/types/utilities';
import type {HighlightWithoutNotificationKey} from 'mattermost-redux/selectors/entities/users';
import {formatWithRenderer} from 'utils/markdown';
import Constants from './constants';
import type EmojiMap from './emoji_map.js';
import * as Emoticons from './emoticons';
import * as Markdown from './markdown';
const punctuationRegex = /[^\p{L}\d]/u;
const UNICODE_EMOJI_REGEX = emojiRegex();
const htmlEmojiPattern = /^<p>\s*(?:<img class="emoticon"[^>]*>|<span data-emoticon[^>]*>[^<]*<\/span>\s*|<span class="emoticon emoticon--unicode">[^<]*<\/span>\s*)+<\/p>$/;
const FORMAT_TOKEN_LIMIT = 1000;
const FORMAT_TOKEN_LIMIT_ERROR = 'maximum number of tokens reached';
export function isFormatTokenLimitError(error: unknown) {
    return Boolean(error && typeof error === 'object' && 'message' in error && (error as Record<string, string>).message === FORMAT_TOKEN_LIMIT_ERROR);
}
export type ChannelNamesMap = {
    [name: string]: {
        display_name: string;
        team_name?: string;
    } | string;
};
export function isChannelNamesMap(v: unknown): v is ChannelNamesMap {
    return isRecordOf(v, (e) => {
        if (typeof e === 'string') {
            return true;
        }
        if (typeof e !== 'object' || !e) {
            return false;
        }
        if (!('display_name' in e) || typeof e.display_name !== 'string') {
            return false;
        }
        if ('team_name' in e && typeof e.team_name !== 'string') {
            return false;
        }
        return true;
    });
}
export type SearchPattern = {
    pattern: RegExp;
    term: string;
};
export type MentionKey = {
    key: string;
    caseSensitive?: boolean;
};
export type Team = {
    id: string;
    name: string;
    display_name: string;
};
export interface TextFormattingOptionsBase {
    searchTerm: string;
    searchMatches: string[];
    searchPatterns: SearchPattern[];
    mentionHighlight: boolean;
    disableGroupHighlight: boolean;
    mentionKeys: MentionKey[];
    highlightKeys: HighlightWithoutNotificationKey[];
    singleline: boolean;
    emoticons: boolean;
    markdown: boolean;
    siteURL: string;
    atMentions: boolean;
    channelNamesMap: ChannelNamesMap;
    team: Team;
    proxyImages: boolean;
    managedResourcePaths: string[];
    renderer: Renderer;
    minimumHashtagLength: number;
    editedAt: number;
    postId: string;
    atSumOfMembersMentions: boolean;
    atPlanMentions: boolean;
    unsafeLinks: boolean;
    renderEmoticonsAsEmoji: boolean;
}
export type TextFormattingOptions = Partial<TextFormattingOptionsBase>;
export class Tokens extends Map<string, {value: string; originalText: string; hashtag?: string}> {
    set(key: string, value: {value: string; originalText: string; hashtag?: string}) {
        super.set(key, value);
        if (this.size > FORMAT_TOKEN_LIMIT) {
            throw new Error(FORMAT_TOKEN_LIMIT_ERROR);
        }
        return this;
    }
}
const DEFAULT_OPTIONS: TextFormattingOptions = {
    mentionHighlight: true,
    disableGroupHighlight: false,
    singleline: false,
    emoticons: true,
    markdown: true,
    atMentions: false,
    atSumOfMembersMentions: false,
    atPlanMentions: false,
    minimumHashtagLength: 3,
    proxyImages: false,
    editedAt: 0,
    postId: '',
    unsafeLinks: false,
    renderEmoticonsAsEmoji: true,
};
export const cjkrPattern = /[\u3000-\u303f\u3040-\u309f\u30a0-\u30ff\uff00-\uff9f\u4e00-\u9faf\u3400-\u4dbf\uac00-\ud7a3\u1100-\u11ff\u3130-\u318f\u0400-\u04ff\u0500-\u052f\u2de0-\u2dff\u0e00-\u0e7f]/;
export function formatText(
    text: string,
    inputOptions: TextFormattingOptions = DEFAULT_OPTIONS,
    emojiMap: EmojiMap,
): string {
    if (!text) {
        return '';
    }
    let output = text;
    const options = Object.assign({}, inputOptions);
    const hasPhrases = (/"([^"]*)"/).test(options.searchTerm || '');
    if (options.searchMatches && !hasPhrases) {
        options.searchPatterns = options.searchMatches.map(convertSearchTermToRegex);
    } else {
        options.searchPatterns = parseSearchTerms(options.searchTerm || '').map(convertSearchTermToRegex).sort((a, b) => {
            return b.term.length - a.term.length;
        });
    }
    if (options.renderer) {
        output = formatWithRenderer(output, options.renderer);
        output = doFormatText(output, options, emojiMap);
    } else if (!('markdown' in options) || options.markdown) {
        output = Markdown.format(output, options, emojiMap);
        if (output.includes('class="markdown-inline-img"')) {
            const replacer = (match: string) => {
                return match === '<p>' ? '<div class="markdown-inline-img__container">' : '</div>';
            };
            output = output.replace(/data-codeblock-code="[^"]+"|[\r\n]+(?!(<p>))/g, (match: string) => {
                if (match.includes('data-codeblock-code')) {
                    return match;
                }
                return '<br/>';
            });
            output = output.replace(/<p>|<\/p>/g, replacer);
        }
    } else {
        output = sanitizeHtml(output);
        output = doFormatText(output, options, emojiMap);
    }
    if (options.singleline) {
        output = replaceNewlines(output);
    }
    if (htmlEmojiPattern.test(output.trim())) {
        output = `<span class="all-emoji">${output.trim()}</span>`;
    }
    if (options.postId) {
        if (output.endsWith('</p>')) {
            output = `${output.slice(0, -4)}<span data-edited-post-id='${options.postId}'></span></p>`;
        } else {
            output += `<span data-edited-post-id='${options.postId}'></span>`;
        }
    }
    return output;
}
export function doFormatText(text: string, options: TextFormattingOptions, emojiMap: EmojiMap): string {
    let output = text;
    const tokens = new Tokens();
    try {
        if (options.atMentions) {
            output = autolinkAtMentions(output, tokens);
        }
        if (options.atSumOfMembersMentions) {
            output = autoLinkSumOfMembersMentions(output, tokens);
        }
        if (options.atPlanMentions) {
            output = autoPlanMentions(output, tokens);
        }
        if (options.channelNamesMap) {
            output = autolinkChannelMentions(
                output,
                tokens,
                options.channelNamesMap,
                options.team,
            );
        }
        output = autolinkEmails(output, tokens);
        output = autolinkHashtags(output, tokens, options.minimumHashtagLength);
        if (!('emoticons' in options) || options.emoticons) {
            output = Emoticons.handleEmoticons(output, tokens, options.renderEmoticonsAsEmoji);
        }
        if (options.searchPatterns) {
            output = highlightSearchTerms(output, tokens, options.searchPatterns);
        }
        if (!('mentionHighlight' in options) || options.mentionHighlight) {
            output = highlightCurrentMentions(output, tokens, options.mentionKeys);
        }
        if (options.highlightKeys && options.highlightKeys.length > 0) {
            output = highlightWithoutNotificationKeywords(output, tokens, options.highlightKeys);
        }
        if (!('emoticons' in options) || options.emoticons) {
            output = handleUnicodeEmoji(output, emojiMap, UNICODE_EMOJI_REGEX);
        }
        output = replaceTokens(output, tokens) || text;
        return output;
    } catch (error) {
        if (isFormatTokenLimitError(error)) {
            return text;
        }
        throw error;
    }
}
export function sanitizeHtml(text: string): string {
    let output = text;
    output = output.replace(/&/g, '&amp;');
    output = output.replace(/</g, '&lt;');
    output = output.replace(/>/g, '&gt;');
    output = output.replace(/'/g, '&apos;');
    output = output.replace(/"/g, '&quot;');
    return output;
}
const emailRegex = /(^|[^\p{L}\d])((?:[\p{L}\p{Nd}!#$%&'*+\-\/=?^_`{|}~](?:[\p{L}\p{Nd}!#$%&'*+\-\/=?^_`{|}~]|\.(?!\.|@))*|"[\p{L}\p{Nd}!#$%&'*+\-\/=?^_`{|}~\s(),:;<>@\[\].]+")@[\p{L}\d.\-]+[.]\p{L}{2,5}(?=$|[^\p{L}]))/gu;
function autolinkEmails(text: string, tokens: Tokens) {
    function replaceEmailWithToken(
        fullMatch: string,
        ...args: Array<string | number>
    ) {
        const prefix = args[0] as string;
        const email = args[1] as string;
        const index = tokens.size;
        const alias = `$MM_EMAIL${index}$`;
        tokens.set(alias, {
            value: `<a class="theme" href="mailto:${email}" rel="noreferrer" target="_blank">${email}</a>`,
            originalText: email,
        });
        return prefix + alias;
    }
    return text.replace(emailRegex, replaceEmailWithToken);
}
export function autoLinkSumOfMembersMentions(text: string, tokens: Tokens): string {
    function replaceSumOfMembersMentionWithToken(fullMatch: string) {
        const index = tokens.size;
        const alias = `$MM_SUMOFMEMBERSMENTION${index}$`;
        tokens.set(alias, {
            value: `<span data-sum-of-members-mention="${fullMatch}">${fullMatch}</span>`,
            originalText: fullMatch,
        });
        return alias;
    }
    let output = text;
    output = output.replace(
        Constants.SUM_OF_MEMBERS_MENTION_REGEX,
        replaceSumOfMembersMentionWithToken,
    );
    return output;
}
export function autoPlanMentions(text: string, tokens: Tokens): string {
    function replacePlanMentionWithToken(fullMatch: string) {
        const index = tokens.size;
        const alias = `$MM_PLANMENTION${index}$`;
        tokens.set(alias, {
            value: `<span data-plan-mention="${fullMatch}">${fullMatch}</span>`,
            originalText: fullMatch,
        });
        return alias;
    }
    let output = text;
    output = output.replace(
        Constants.PLAN_MENTIONS,
        replacePlanMentionWithToken,
    );
    return output;
}
export function autolinkAtMentions(text: string, tokens: Tokens): string {
    function replaceAtMentionWithToken(fullMatch: string, username: string) {
        let originalText = fullMatch;
        while (originalText[0] === '_') {
            originalText = originalText.substring(1);
        }
        const index = tokens.size;
        const alias = `$MM_ATMENTION${index}$`;
        tokens.set(alias, {
            value: `<span data-mention="${username}">@${username}</span>`,
            originalText,
        });
        return alias;
    }
    let output = text;
    output = output.replace(
        Constants.SPECIAL_MENTIONS_REGEX,
        replaceAtMentionWithToken,
    );
    let match = output.match(Constants.MENTIONS_REGEX);
    while (match && match.length > 0) {
        output = output.replace(Constants.MENTIONS_REGEX, replaceAtMentionWithToken);
        match = output.match(Constants.MENTIONS_REGEX);
    }
    return output;
}
export function allAtMentions(text: string): string[] {
    return text.match(Constants.SPECIAL_MENTIONS_REGEX && Constants.MENTIONS_REGEX) || [];
}
export function autolinkChannelMentions(
    text: string,
    tokens: Tokens,
    channelNamesMap: ChannelNamesMap,
    team?: Team,
) {
    function channelMentionExists(c: string) {
        return Object.hasOwn(channelNamesMap, c);
    }
    function addToken(channelName: string, teamName: string, mention: string, displayName: string) {
        const index = tokens.size;
        const alias = `$MM_CHANNELMENTION${index}$`;
        let href = '#';
        if (teamName) {
            href = ((window as any).basename || '') + '/' + teamName + '/channels/' + channelName;
            tokens.set(alias, {
                value: `<a class="mention-link" href="${href}" data-channel-mention-team="${teamName}" data-channel-mention="${channelName}">~${displayName}</a>`,
                originalText: mention,
            });
        } else if (team) {
            href = ((window as any).basename || '') + '/' + team.name + '/channels/' + channelName;
            tokens.set(alias, {
                value: `<a class="mention-link" href="${href}" data-channel-mention="${channelName}">~${displayName}</a>`,
                originalText: mention,
            });
        }
        return alias;
    }
    function replaceChannelMentionWithToken(
        fullMatch: string,
        mention: string,
        channelName: string,
    ) {
        let channelNameLower = channelName.toLowerCase();
        if (channelMentionExists(channelNameLower)) {
            let displayName = '';
            let teamName = '';
            const channelValue = channelNamesMap[channelNameLower];
            if (typeof channelValue === 'object') {
                displayName = channelValue.display_name;
                teamName = channelValue.team_name || '';
            } else {
                displayName = channelValue;
            }
            return addToken(
                channelNameLower,
                teamName,
                mention,
                escapeHtml(displayName),
            );
        }
        const originalChannelName = channelNameLower;
        for (let c = channelNameLower.length; c > 0; c--) {
            if (punctuationRegex.test(channelNameLower[c - 1])) {
                channelNameLower = channelNameLower.substring(0, c - 1);
                if (channelMentionExists(channelNameLower)) {
                    const suffix = originalChannelName.substr(c - 1);
                    let displayName = '';
                    let teamName = '';
                    const channelValue = channelNamesMap[channelNameLower];
                    if (typeof channelValue === 'object') {
                        displayName = channelValue.display_name;
                        teamName = channelValue.team_name || '';
                    } else {
                        displayName = channelValue;
                    }
                    const alias = addToken(
                        channelNameLower,
                        teamName,
                        '~' + channelNameLower,
                        escapeHtml(displayName),
                    );
                    return alias + suffix;
                }
            } else {
                break;
            }
        }
        return fullMatch;
    }
    let output = text;
    output = output.replace(
        /\B(~([a-z0-9.\-_]*))/gi,
        replaceChannelMentionWithToken,
    );
    return output;
}
export function escapeReplaceSpecialPatterns(text?: string): string {
    return text?.replace(/[$]/g, '$$$$') || '';
}
const htmlEntities = {
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    '"': '&quot;',
    "'": '&#039;',
};
export function escapeHtml(text: string): string {
    return text.replace(
        /[&<>"']/g,
        (match: string) => htmlEntities[match as keyof (typeof htmlEntities)],
    );
}
export function convertEntityToCharacter(text: string): string {
    return text.
        replace(/&lt;/g, '<').
        replace(/&gt;/g, '>').
        replace(/&#39;/g, "'").
        replace(/&quot;/g, '"').
        replace(/&amp;/g, '&');
}
export function highlightCurrentMentions(
    text: string,
    tokens: Tokens,
    mentionKeys: MentionKey[] = [],
) {
    let output = text;
    const newTokens = new Map();
    for (const [alias, token] of tokens) {
        const tokenTextLower = token.originalText.toLowerCase();
        if (mentionKeys.findIndex((key) => key.key.toLowerCase() === tokenTextLower) !== -1) {
            const index = tokens.size + newTokens.size;
            const newAlias = `$MM_SELFMENTION${index}$`;
            newTokens.set(newAlias, {
                value: `<span class="mention--highlight">${alias}</span>`,
                originalText: token.originalText,
            });
            output = output.replace(alias, newAlias);
        }
    }
    for (const newToken of newTokens) {
        tokens.set(newToken[0], newToken[1]);
    }
    function replaceCurrentMentionWithToken(
        fullMatch: string,
        prefix: string,
        mention: string,
        suffix = '',
    ) {
        const index = tokens.size;
        const alias = `$MM_SELFMENTION${index}$`;
        tokens.set(alias, {
            value: `<span class="mention--highlight">${mention}</span>`,
            originalText: mention,
        });
        return prefix + alias + suffix;
    }
    for (const mention of mentionKeys) {
        if (!mention || !mention.key) {
            continue;
        }
        let flags = 'g';
        if (!mention.caseSensitive) {
            flags += 'i';
        }
        let pattern;
        if (cjkrPattern.test(mention.key)) {
            pattern = new RegExp(`()(${RegExp.escape(mention.key)})()`, flags);
        } else {
            pattern = new RegExp(
                `(^|\\W)(${RegExp.escape(mention.key)})(\\b|_+\\b)`,
                flags,
            );
        }
        output = output.replace(pattern, replaceCurrentMentionWithToken);
    }
    return output;
}
export function highlightWithoutNotificationKeywords(
    text: string,
    tokens: Tokens,
    highlightKeys: HighlightWithoutNotificationKey[] = [],
) {
    let output = text;
    const newTokens = new Map();
    tokens.forEach((token, alias) => {
        const tokenOriginalText = token.originalText.toLowerCase();
        if (highlightKeys.findIndex((highlightKey) => highlightKey.key.toLowerCase() === tokenOriginalText) !== -1) {
            const newIndex = tokens.size + newTokens.size;
            const newAlias = `$MM_HIGHLIGHTKEYWORD${newIndex}$`;
            newTokens.set(newAlias, {
                value: `<span class="non-notification-highlight">${alias}</span>`,
                originalText: token.originalText,
            });
            output = output.replace(alias, newAlias);
        }
    });
    newTokens.forEach((newToken, newAlias) => {
        tokens.set(newAlias, newToken);
    });
    function replaceHighlightKeywordsWithToken(
        _: string,
        prefix: string,
        highlightKey: string,
        suffix = '',
    ) {
        const index = tokens.size;
        const alias = `$MM_HIGHLIGHTKEYWORD${index}$`;
        tokens.set(alias, {
            value: `<span class="non-notification-highlight">${highlightKey}</span>`,
            originalText: highlightKey,
        });
        return prefix + alias + suffix;
    }
    highlightKeys.
        sort((a, b) => b.key.length - a.key.length).
        forEach(({key}) => {
            if (!key) {
                return;
            }
            let pattern;
            if (cjkrPattern.test(key)) {
                pattern = new RegExp(`()(${RegExp.escape(key)})()`, 'gi');
            } else {
                pattern = new RegExp(`(^|\\W)(${RegExp.escape(key)})(\\b|_+\\b)`, 'gi');
            }
            output = output.replace(pattern, replaceHighlightKeywordsWithToken);
        });
    return output;
}
const hashtagRegex = /(^|\W)(#\p{L}[\p{L}\d\-_.]*[\p{L}\d])/gu;
function autolinkHashtags(
    text: string,
    tokens: Tokens,
    minimumHashtagLength = 3,
) {
    let output = text;
    const newTokens = new Map();
    for (const [alias, token] of tokens) {
        if (token.originalText.lastIndexOf('#', 0) === 0) {
            const index = tokens.size + newTokens.size;
            const newAlias = `$MM_HASHTAG${index}$`;
            newTokens.set(newAlias, {
                value: `<a class='mention-link' href='#' data-hashtag='${token.originalText}'>${token.originalText}</a>`,
                originalText: token.originalText,
                hashtag: token.originalText.substring(1),
            });
            output = output.replace(alias, newAlias);
        }
    }
    for (const newToken of newTokens) {
        tokens.set(newToken[0], newToken[1]);
    }
    function replaceHashtagWithToken(
        fullMatch: string,
        prefix: string,
        originalText: string,
    ) {
        const index = tokens.size;
        const alias = `$MM_HASHTAG${index}$`;
        if (originalText.length < minimumHashtagLength + 1) {
            return fullMatch;
        }
        tokens.set(alias, {
            value: `<a class='mention-link' href='#' data-hashtag='${originalText}'>${originalText}</a>`,
            originalText,
            hashtag: originalText.substring(1),
        });
        return prefix + alias;
    }
    return output.replace(
        hashtagRegex,
        replaceHashtagWithToken,
    );
}
const puncStart = /^[^\p{L}\d\s#]+/u;
const puncEnd = /[^\p{L}\d\s]+$/u;
export function parseSearchTerms(searchTerm: string): string[] {
    let terms = [];
    let termString = searchTerm;
    while (termString) {
        let captured;
        captured = (/^"([^"]*)"/).exec(termString);
        if (captured) {
            termString = termString.substring(captured[0].length);
            if (captured[1].length > 0) {
                terms.push(captured[1]);
            }
            continue;
        }
        captured = (/^-?(?:in|from|channel|on|before|after): ?\S+/).exec(termString);
        if (captured) {
            termString = termString.substring(captured[0].length);
            continue;
        }
        captured = (/^@[a-z0-9.-_]+\b/).exec(termString);
        if (captured) {
            termString = termString.substring(captured[0].length);
            terms.push(captured[0]);
            continue;
        }
        captured = (/^.+?(?=(?:\b|\B-)(?:in:|from:|channel:|on:|before:|after:)|"|$)/).exec(termString);
        if (captured) {
            termString = termString.substring(captured[0].length);
            terms.push(
                ...captured[0].split(/[ <>+()~@]/).filter((term) => Boolean(term)),
            );
            continue;
        }
        throw new Error(
            'Infinite loop in search term parsing: "' + termString + '"',
        );
    }
    terms = terms.map((term) => {
        term.replace(puncStart, '');
        if (term.charAt(term.length - 1) !== '*') {
            term.replace(puncEnd, '');
        }
        return term;
    });
    return terms;
}
function convertSearchTermToRegex(term: string): SearchPattern {
    let pattern;
    if (cjkrPattern.test(term)) {
        pattern = '()(' + RegExp.escape(term.replace(/\*/g, '')) + ')';
    } else if ((/[^\s][*]$/).test(term)) {
        pattern = '\\b()(' + RegExp.escape(term.substring(0, term.length - 1)) + ')';
    } else if (term.startsWith('@') || term.startsWith('#')) {
        pattern = '(\\W|^)(' + RegExp.escape(term) + ')\\b';
    } else {
        pattern = '\\b()(' + RegExp.escape(term) + ')\\b';
    }
    return {
        pattern: new RegExp(pattern, 'gi'),
        term,
    };
}
export function highlightSearchTerms(
    text: string,
    tokens: Tokens,
    searchPatterns: SearchPattern[],
): string {
    if (!searchPatterns || searchPatterns.length === 0) {
        return text;
    }
    let output = text;
    function replaceSearchTermWithToken(
        match: string,
        prefix: string,
        word: string,
    ) {
        const index = tokens.size;
        const alias = `$MM_SEARCHTERM${index}$`;
        tokens.set(alias, {
            value: `<span class="search-highlight">${word}</span>`,
            originalText: word,
        });
        return prefix + alias;
    }
    for (const pattern of searchPatterns) {
        const newTokens = new Map();
        for (const [alias, token] of tokens) {
            if (pattern.pattern.test(token.originalText)) {
                let originalText = token.originalText;
                if (originalText.startsWith('#')) {
                    originalText = originalText.substr(1);
                }
                let term = pattern.term;
                if (term.startsWith('#')) {
                    term = term.substr(1);
                }
                if (
                    alias.startsWith('$MM_HASHTAG') &&
          alias.endsWith('$') &&
          originalText.toLowerCase() !== term.toLowerCase()
                ) {
                    continue;
                }
                const index = tokens.size + newTokens.size;
                const newAlias = `$MM_SEARCHTERM${index}$`;
                newTokens.set(newAlias, {
                    value: `<span class="search-highlight">${alias}</span>`,
                    originalText: token.originalText,
                });
                output = output.replace(alias, newAlias);
            }
            pattern.pattern.lastIndex = 0;
        }
        for (const newToken of newTokens) {
            tokens.set(newToken[0], newToken[1]);
        }
        output = output.replace(pattern.pattern, replaceSearchTermWithToken);
    }
    return output;
}
export function replaceTokens(text: string, tokens: Tokens): string {
    let output = text;
    const aliases = [...tokens.keys()];
    for (let i = aliases.length - 1; i >= 0; i--) {
        const alias = aliases[i];
        const token = tokens.get(alias);
        output = output.replace(alias, escapeReplaceSpecialPatterns(token?.value || ''));
    }
    return output;
}
function replaceNewlines(text: string) {
    return text.replace(/\n/g, ' ');
}
export function handleUnicodeEmoji(text: string, emojiMap: EmojiMap, searchPattern: RegExp): string {
    let output = text;
    output = output.replace(searchPattern, (emojiMatch) => {
        const codePoints = [fixedCharCodeAt(emojiMatch, 0)];
        if (emojiMatch.length > 1) {
            for (let i = 1; i < emojiMatch.length; i++) {
                const codePoint = fixedCharCodeAt(emojiMatch, i);
                if (codePoint === -1) {
                    continue;
                }
                codePoints.push(codePoint);
            }
        }
        const emojiCode = codePoints.map((codePoint) => codePoint.toString(16)).join('-');
        if (emojiMap && emojiMap.hasUnicode(emojiCode)) {
            const emoji = emojiMap.getUnicode(emojiCode) as SystemEmoji;
            return Emoticons.renderEmoji(emoji.short_names[0], emojiMatch);
        }
        return `<span class="emoticon emoticon--unicode">${emojiMatch}</span>`;
    });
    return output;
}
function fixedCharCodeAt(str: string, idx = 0) {
    const code = str.charCodeAt(idx);
    if (code >= 0xD800 && code <= 0xDBFF) {
        const hi = code;
        const low = str.charCodeAt(idx + 1);
        if (isNaN(low)) {
            console.log('High surrogate not followed by low surrogate in fixedCharCodeAt()');
        }
        return ((hi - 0xD800) * 0x400) + (low - 0xDC00) + 0x10000;
    }
    if (code >= 0xDC00 && code <= 0xDFFF) {
        return -1;
    }
    return code;
}