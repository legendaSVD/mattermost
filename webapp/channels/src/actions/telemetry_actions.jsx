import {Client4} from 'mattermost-redux/client';
const HEADER_X_PAGE_LOAD_CONTEXT = 'X-Page-Load-Context';
export function clearMarks(names) {
    names.forEach((name) => performance.clearMarks(name));
}
export function mark(name) {
    performance.mark(name);
}
export const temporarilySetPageLoadContext = (pageLoadContext) => {
    Client4.setHeader(HEADER_X_PAGE_LOAD_CONTEXT, pageLoadContext);
    setTimeout(() => {
        Client4.removeHeader(HEADER_X_PAGE_LOAD_CONTEXT);
    }, 5000);
};