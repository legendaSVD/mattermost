Cypress.Commands.add('uiGetProductMenuButton', () => {
    return cy.findByRole('button', {name: 'Product switch menu'}).should('be.visible');
});
Cypress.Commands.add('uiGetProductMenu', () => {
    return cy.get('.product-switcher-menu').should('be.visible');
});
Cypress.Commands.add('uiOpenProductMenu', (item = '') => {
    cy.uiGetProductMenuButton().click();
    if (!item) {
        return cy.uiGetProductMenu();
    }
    return cy.uiGetProductMenu().
        findByText(item).
        scrollIntoView().
        should('be.visible').
        click();
});
Cypress.Commands.add('uiGetSetStatusButton', () => {
    return cy.get('#userAccountMenuButton').should('be.visible');
});
Cypress.Commands.add('uiGetProfileHeader', () => {
    return cy.uiGetSetStatusButton().parent();
});
Cypress.Commands.add('uiGetStatusMenuContainer', (options = {exist: true}) => {
    if (options.exist) {
        return cy.get('#userAccountMenu').should('exist').and('be.visible');
    }
    return cy.get('#userAccountMenu').should('not.exist');
});
Cypress.Commands.add('uiGetStatusMenu', (options = {visible: true}) => {
    if (options.visible) {
        return cy.get('#userAccountMenu').should('exist').and('be.visible');
    }
    return cy.get('#userAccountMenu').should('not.exist');
});
Cypress.Commands.add('uiOpenHelpMenu', (item = '') => {
    cy.uiGetHelpButton().click();
    if (!item) {
        return cy.uiGetHelpMenu();
    }
    return cy.uiGetHelpMenu().
        findByText(item).
        scrollIntoView().
        should('be.visible').
        click();
});
Cypress.Commands.add('uiGetHelpButton', () => {
    return cy.findByRole('button', {name: 'Help'}).should('be.visible');
});
Cypress.Commands.add('uiGetHelpMenu', (options = {visible: true}) => {
    const dropdown = () => cy.get('#helpMenuPortal').find('.dropdown-menu');
    if (options.visible) {
        return dropdown().should('be.visible');
    }
    return dropdown().should('not.be.visible');
});
Cypress.Commands.add('uiOpenUserMenu', (item = '') => {
    cy.uiGetSetStatusButton().click();
    if (!item) {
        return cy.uiGetStatusMenu();
    }
    return cy.uiGetStatusMenu().
        findByText(item).
        scrollIntoView().
        should('be.visible').
        click();
});
Cypress.Commands.add('uiGetSearchContainer', () => {
    return cy.get('#searchFormContainer').should('be.visible');
});
Cypress.Commands.add('uiGetSearchBox', () => {
    return cy.findByRole('searchbox').should('be.visible');
});
Cypress.Commands.add('uiGetRecentMentionButton', () => {
    return cy.findByRole('button', {name: 'Recent mentions'}).should('be.visible');
});
Cypress.Commands.add('uiGetSavedPostButton', () => {
    return cy.findByRole('button', {name: 'Saved messages'}).should('be.visible');
});
Cypress.Commands.add('uiGetSettingsButton', () => {
    return cy.findByRole('button', {name: 'Settings'}).should('be.visible');
});
Cypress.Commands.add('uiGetChannelInfoButton', () => {
    return cy.findByRole('button', {name: 'View Info'}).should('be.visible');
});
Cypress.Commands.add('uiGetSettingsModal', () => {
    return cy.findByRole('dialog', {name: 'Settings'});
});
Cypress.Commands.add('uiOpenSettingsModal', (section = '') => {
    cy.uiGetSettingsButton().click();
    if (!section) {
        return cy.uiGetSettingsModal();
    }
    cy.findByRoleExtended('tab', {name: section}).should('be.visible').click();
    return cy.uiGetSettingsModal();
});
Cypress.Commands.add('uiLogout', () => {
    cy.uiOpenUserMenu('Log out');
    cy.url().should('include', '/login');
    cy.get('.login-body-message').should('be.visible');
    cy.get('.login-body-card').should('be.visible');
});