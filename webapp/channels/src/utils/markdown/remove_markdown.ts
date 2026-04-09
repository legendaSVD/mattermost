import marked from 'marked';
import * as TextFormatting from 'utils/text_formatting';
const HTML_ENTITY_DECODE_MAP: Record<string, string> = {
    '&#33;': '!',
    '&#34;': '"', // Double Quote
    '&#35;': '#',
    '&#38;': '&',
    '&#39;': "'", // Single Quote/Apostrophe
    '&#40;': '(',
    '&#41;': ')',
    '&#42;': '*',
    '&#43;': '+',
    '&#45;': '-',
    '&#46;': '.',
    '&#47;': '/',
    '&#58;': ':',
    '&#59;': ';',
    '&#60;': '<',
    '&#61;': '=',
    '&#62;': '>',
    '&#63;': '?',
    '&#64;': '@',
    '&#91;': '[',
    '&#92;': '\\', // Backslash
    '&#93;': ']',
    '&#94;': '^',
    '&#95;': '_',
    '&#96;': '`',
    '&#123;': '{',
    '&#124;': '|',
    '&#125;': '}',
    '&#126;': '~',
    '&amp;': '&',
    '&lt;': '<',
    '&gt;': '>',
    '&quot;': '"', // Double Quote
    '&apos;': "'", // Single Quote/Apostrophe
};
const HTML_ENTITY_PATTERN = new RegExp(
    Object.keys(HTML_ENTITY_DECODE_MAP).map((key) => RegExp.escape(key)).join('|'),
    'g',
);
export default class RemoveMarkdown extends marked.Renderer {
    public code(text: string) {
        return TextFormatting.escapeHtml(text).replace(/\n/g, ' ');
    }
    public blockquote(text: string) {
        return text.replace(/\n/g, ' ');
    }
    public heading(text: string) {
        return text + ' ';
    }
    public hr() {
        return '';
    }
    public list(body: string) {
        return body;
    }
    public listitem(text: string) {
        return text + ' ';
    }
    public paragraph(text: string) {
        return text + ' ';
    }
    public table() {
        return '';
    }
    public tablerow() {
        return '';
    }
    public tablecell() {
        return '';
    }
    public strong(text: string) {
        return text;
    }
    public em(text: string) {
        return text;
    }
    public codespan(text: string) {
        return text.replace(/\n/g, ' ');
    }
    public br() {
        return ' ';
    }
    public del(text: string) {
        return text;
    }
    public link(href: string, title: string, text: string) {
        return text;
    }
    public image(href: string, title: string, text: string) {
        return text;
    }
    public text(text: string) {
        return text.
            replace('\n', ' ').
            replace(HTML_ENTITY_PATTERN, (match) => HTML_ENTITY_DECODE_MAP[match]);
    }
}