declare namespace Cypress {
    interface Chainable {
        uiGetChannelHeaderButton(): Chainable;
        uiGetChannelFavoriteButton(): Chainable;
        uiGetMuteButton(): Chainable;
        uiGetChannelMemberButton(): Chainable;
        uiGetChannelPinButton(): Chainable;
        uiGetChannelFileButton(): Chainable;
        uiGetChannelMenu(): Chainable;
        uiOpenChannelMenu(menu?: string): Chainable;
    }
}