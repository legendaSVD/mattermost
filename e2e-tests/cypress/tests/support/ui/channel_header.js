Cypress.Commands.add('uiGetChannelHeaderButton', () => {
    return cy.get('#channelHeaderDropdownButton').should('be.visible');
});
Cypress.Commands.add('uiGetChannelFavoriteButton', () => {
    return cy.get('#toggleFavorite').should('be.visible');
});
Cypress.Commands.add('uiGetMuteButton', () => {
    return cy.get('#toggleMute').should('be.visible');
});
Cypress.Commands.add('uiGetChannelMemberButton', () => {
    return cy.get('#member_rhs').should('be.visible');
});
Cypress.Commands.add('uiGetChannelPinButton', () => {
    return cy.get('#channelHeaderPinButton').should('be.visible');
});
Cypress.Commands.add('uiGetChannelFileButton', () => {
    return cy.get('#channelHeaderFilesButton').should('be.visible');
});
Cypress.Commands.add('uiGetChannelMenu', (options = {exist: true}) => {
    if (options.exist) {
        return cy.get('#channelHeaderDropdownMenu').
            should('be.visible');
    }
    return cy.get('#channelHeaderDropdownMenu').should('not.exist');
});
Cypress.Commands.add('uiOpenChannelMenu', (item = '') => {
    cy.uiGetChannelHeaderButton().click();
    if (!item) {
        return cy.uiGetChannelMenu();
    }
    return cy.uiGetChannelMenu().
        findByText(item).
        scrollIntoView().
        should('be.visible').
        click();
});