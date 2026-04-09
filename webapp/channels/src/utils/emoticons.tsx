import {formatWithRenderer} from './markdown';
import PlainRenderer from './markdown/plain_renderer';
export const emoticonPatterns: { [key: string]: RegExp } = {
    slightly_smiling_face: /(^|\B)(\\?:-?\))($|\B)/g,
    wink: /(^|\B)(\\?;-?\))($|\B)/g,
    open_mouth: /(^|\B)(\\?:o)($|\b)/gi,
    scream: /(^|\B)(\\?:-o)($|\b)/gi,
    smirk: /(^|\B)(\\?:-?])($|\B)/g,
    smile: /(^|\B)(\\?:-?d)($|\b)/gi,
    stuck_out_tongue_closed_eyes: /(^|\b)(\\?x-d)($|\b)/gi,
    stuck_out_tongue: /(^|\B)(\\?:-?p)($|\b)/gi,
    rage: /(^|\B)(\\?:-?[[@])($|\B)/g,
    slightly_frowning_face: /(^|\B)(\\?:-?\()($|\B)/g,
    cry: /(^|\B)(\\?:[`'’]-?\(|\\?:&#x27;\(|\\?:&#39;\()($|\B)/g, // :`(
    confused: /(^|\B)(\\?:-?\/)($|\B)/g,
    confounded: /(^|\B)(\\?:-?s)($|\b)/gi,
    neutral_face: /(^|\B)(\\?:-?\|)($|\B)/g,
    flushed: /(^|\B)(\\?:-?\$)($|\B)/g,
    mask: /(^|\B)(\\?:-x)($|\b)/gi,
    heart: /(^|\B)(\\?<3|\\?&lt;3)($|\b)/g,
    broken_heart: /(^|\B)(\\?<\/3|\\?&lt;\/3)($|\b)/g,
};
export const EMOJI_PATTERN = /(:([a-zA-Z0-9_+-]+):)/g;
export function matchEmoticons(text: string): string[] | null {
    const markdownCleanedText = formatWithRenderer(text, new PlainRenderer());
    let emojis: string[] | null = markdownCleanedText.match(EMOJI_PATTERN);
    for (const name of Object.keys(emoticonPatterns)) {
        const pattern = emoticonPatterns[name];
        const matches = markdownCleanedText.match(pattern);
        if (matches) {
            if (emojis) {
                emojis = emojis.concat(matches);
            } else {
                emojis = matches;
            }
        }
    }
    return emojis;
}
export function handleEmoticons(
    text: string,
    tokens: Map<string, {value: string; originalText: string}>,
    renderEmoticonsAsEmoji = true,
): string {
    let output = text;
    function replaceEmoticonWithToken(
        fullMatch: string,
        prefix: string,
        matchText: string,
        name: string,
    ): string {
        const index = tokens.size;
        const alias = `$MM_EMOTICON${index}$`;
        const escaped = matchText.startsWith('\\');
        if (escaped) {
            return prefix + matchText.substring(1);
        }
        tokens.set(alias, {
            value: renderEmoji(name, matchText),
            originalText: fullMatch,
        });
        return prefix + alias;
    }
    output = output.replace(
        EMOJI_PATTERN,
        (fullMatch: string, matchText: string, name: string): string =>
            replaceEmoticonWithToken(fullMatch, '', matchText, name),
    );
    if (renderEmoticonsAsEmoji) {
        for (const name of Object.keys(emoticonPatterns)) {
            const pattern = emoticonPatterns[name];
            output = output.replace(pattern, (fullMatch, prefix, matchText) => replaceEmoticonWithToken(fullMatch, prefix, matchText, name));
        }
    }
    return output;
}
export function renderEmoji(name: string, matchText: string): string {
    return `<span data-emoticon="${name.toLowerCase()}">${matchText}</span>`;
}