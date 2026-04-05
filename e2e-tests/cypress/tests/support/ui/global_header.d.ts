declare namespace Cypress {
    interface Chainable {
        uiGetProductMenuButton(): Chainable;
        uiGetProductMenu(): Chainable;
        uiOpenProductMenu(item: string = ''): Chainable;
        uiGetSetStatusButton(): Chainable;
        uiGetProfileHeader(): Chainable;
        uiGetStatusMenuContainer(option?: Record<string, boolean>): Chainable;
        uiGetStatusMenu(): Chainable;
        uiOpenHelpMenu(item: string): Chainable;
        uiGetHelpButton(): Chainable;
        uiGetHelpMenu(): Chainable;
        uiOpenUserMenu(item?: string): Chainable;
        uiGetSearchContainer(): Chainable;
        uiGetSearchBox(): Chainable;
        uiGetRecentMentionButton(): Chainable;
        uiGetSavedPostButton(): Chainable;
        uiGetSettingsButton(): Chainable;
        uiGetSettingsModal(): Chainable;
        uiGetChannelInfoButton(): Chainable;
        uiOpenSettingsModal(section: string): Chainable;
        uiLogout(): Chainable;
    }
}