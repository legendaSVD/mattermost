import marked from 'marked';
import React from 'react';
import type {MessageDescriptor} from 'react-intl';
import {useIntl} from 'react-intl';
import {shouldOpenInNewTab, getSiteURL} from 'utils/url';
const TARGET_BLANK_URL_PREFIX = '!';
export class CustomRenderer extends marked.Renderer {
    private disableLinks: boolean;
    constructor(disableLinks = false) {
        super();
        this.disableLinks = disableLinks;
    }
    link(href: string, title: string, text: string) {
        const siteURL = getSiteURL();
        const openInNewTab = shouldOpenInNewTab(href, siteURL);
        if (this.disableLinks) {
            return text;
        }
        if (href[0] === TARGET_BLANK_URL_PREFIX) {
            return `<a href="${href.substring(1, href.length)}" rel="noopener noreferrer" target="_blank">${text}</a>`;
        }
        if (openInNewTab) {
            return `<a href="${href}" rel="noopener noreferrer" target="_blank">${text}</a>`;
        }
        return `<a href="${href}">${text}</a>`;
    }
    paragraph(text: string) {
        return text;
    }
}
type Props = {
    defaultMessage?: MessageDescriptor['defaultMessage'];
    disableLinks?: boolean;
    id?: string;
    values?: Record<string, any>;
}
export default function FormattedMarkdownMessage({
    id,
    defaultMessage,
    values,
    disableLinks,
}: Props) {
    const intl = useIntl();
    const origMsg = intl.formatMessage({id, defaultMessage}, values);
    const markedUpMessage = marked(origMsg, {
        breaks: true,
        sanitize: true,
        renderer: new CustomRenderer(disableLinks),
    });
    return (<span dangerouslySetInnerHTML={{__html: markedUpMessage}}/>);
}