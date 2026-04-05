declare namespace Cypress {
    interface Chainable {
        uiClickCopyLink(permalink: string, postId: string): Chainable;
        uiClickPostDropdownMenu(postId: string, menuItem: string, location?: string): Chainable;
    }
}