import {getScheme} from 'utils/url';
import RemoveMarkdown from './remove_markdown';
export default class LinkOnlyRenderer extends RemoveMarkdown {
    public link(href: string, title: string, text: string) {
        let outHref = href;
        if (!getScheme(href)) {
            outHref = `http:
        }
        let output = `<a class="theme markdown__link" href="${outHref}" target="_blank"`;
        if (title) {
            output += ' title="' + title + '"';
        }
        output += `>${text}</a>`;
        return output;
    }
    public text(text: string) {
        return text.replace('\n', ' ');
    }
}