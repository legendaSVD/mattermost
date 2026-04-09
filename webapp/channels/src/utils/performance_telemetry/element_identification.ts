const elementIdentifiers = [
    ['post__content', 'post'],
    ['create_post', 'post_textbox'],
    ['SidebarContainer', 'channel_sidebar'],
    ['team-sidebar', 'team_sidebar'],
    ['channel-header', 'channel_header'],
    ['global-header', 'global_header'],
    ['announcement-bar', 'announcement_bar'],
    ['channel_view', 'center_channel'],
    ['modal-content', 'modal_content'],
] as const satisfies Array<[string, string]>;
export type ElementIdentifier = 'other' | typeof elementIdentifiers[number][1];
export function identifyElementRegion(element: Element): ElementIdentifier {
    let currentElement: Element | null = element;
    while (currentElement) {
        for (const identifier of elementIdentifiers) {
            if (currentElement.id === identifier[0] || currentElement.classList.contains(identifier[0])) {
                return identifier[1];
            }
        }
        currentElement = currentElement.parentElement;
    }
    return 'other';
}