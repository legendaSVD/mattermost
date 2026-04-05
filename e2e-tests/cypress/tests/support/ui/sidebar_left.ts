import {ChainableT} from '../../types';
Cypress.Commands.add('uiGetLHS', () => {
    return cy.get('#SidebarContainer').should('be.visible');
});
Cypress.Commands.add('uiGetLHSHeader', () => {
    return cy.uiGetLHS().
        find('#sidebarTeamMenuButton').
        should('be.visible');
});
Cypress.Commands.add('uiOpenTeamMenu', (item = '') => {
    cy.uiGetLHSHeader().click();
    if (!item) {
        return cy.uiGetLHSTeamMenu();
    }
    return cy.uiGetLHSTeamMenu().
        findByText(item).
        scrollIntoView().
        should('be.visible').
        click();
});
Cypress.Commands.add('uiGetLHSAddChannelButton', () => {
    return cy.uiGetLHS().findByRole('button', {name: 'Browse or create channels'});
});
Cypress.Commands.add('uiGetLHSTeamMenu', () => {
    return cy.get('#sidebarTeamMenu');
});
function uiOpenSystemConsoleMenu(item = ''): ChainableT<JQuery> {
    cy.uiGetSystemConsoleButton().click();
    if (!item) {
        return cy.uiGetSystemConsoleMenu();
    }
    return cy.uiGetSystemConsoleMenu().
        findByText(item).
        scrollIntoView().
        should('be.visible').
        click();
}
Cypress.Commands.add('uiOpenSystemConsoleMenu', uiOpenSystemConsoleMenu);
function uiGetSystemConsoleButton(): ChainableT<JQuery> {
    return cy.get('.admin-sidebar').
        findByRole('button', {name: 'Menu Icon'});
}
Cypress.Commands.add('uiGetSystemConsoleButton', uiGetSystemConsoleButton);
function uiGetSystemConsoleMenu(): ChainableT<JQuery> {
    return cy.get('.admin-sidebar').
        find('.dropdown-menu').
        should('be.visible');
}
Cypress.Commands.add('uiGetSystemConsoleMenu', uiGetSystemConsoleMenu);
Cypress.Commands.add('uiGetLhsSection', (section) => {
    if (section === 'UNREADS') {
        return cy.findByText(section).
            parent().
            parent().
            parent();
    }
    return cy.findAllByRole('button', {name: section}).
        first().
        parent().
        parent().
        parent();
});
Cypress.Commands.add('uiBrowseOrCreateChannel', (menuitem) => {
    cy.uiGetLHSAddChannelButton().should('be.visible').click();
    cy.get('#browserOrAddChannelMenu').
        should('exist').and('be.visible').
        within(() => {
            if (menuitem) {
                cy.findByText(menuitem).should('exist').click();
            }
        });
});
Cypress.Commands.add('uiAddDirectMessage', () => {
    return cy.findByRole('button', {name: 'Write a direct message'});
});
Cypress.Commands.add('uiGetFindChannels', () => {
    return cy.get('#lhsNavigator').findByRole('button', {name: 'Find Channels'});
});
Cypress.Commands.add('uiOpenFindChannels', () => {
    cy.uiGetFindChannels().click();
});
function uiGetSidebarThreadsButton(): ChainableT<JQuery> {
    return cy.get('#sidebar-threads-button').should('be.visible');
}
Cypress.Commands.add('uiGetSidebarThreadsButton', uiGetSidebarThreadsButton);
Cypress.Commands.add('uiGetChannelSidebarMenu', (channelName, isChannelId = false) => {
    cy.uiGetLHS().within(() => {
        if (isChannelId) {
            cy.get(`#sidebarItem_${channelName}`).should('be.visible').find('button').should('exist').click({force: true});
        } else {
            cy.findByText(channelName).should('be.visible').parents('a').find('button').should('exist').click({force: true});
        }
    });
    return cy.findByRole('menu', {name: 'Edit channel menu'}).should('be.visible');
});
Cypress.Commands.add('uiClickSidebarItem', (name) => {
    cy.uiGetSidebarItem(name).click({force: true});
    if (name === 'threads') {
        cy.get('body').then((body) => {
            if (body.find('#genericModalLabel').length > 0) {
                cy.uiCloseModal('A new way to view and follow threads');
            }
        });
        cy.get('#tutorial-threads-mobile-header span.Button_label').contains('Followed threads');
    } else {
        cy.findAllByTestId('postView').last().scrollIntoView().should('be.visible');
    }
});
Cypress.Commands.add('uiGetSidebarItem', (channelName) => {
    return cy.get(`#sidebarItem_${channelName}`);
});
declare global {
    namespace Cypress {
        interface Chainable {
            uiGetLHS(): Chainable;
            uiGetLHSHeader(): Chainable;
            uiOpenTeamMenu(item?: string): Chainable;
            uiGetLHSAddChannelButton(): Chainable;
            uiGetLHSTeamMenu(): Chainable;
            uiGetLhsSection(section: string): Chainable;
            uiBrowseOrCreateChannel(item: string): Chainable;
            uiAddDirectMessage(): Chainable;
            uiGetFindChannels(): Chainable;
            uiOpenFindChannels(): Chainable;
            uiGetChannelSidebarMenu(channelName: string, isChannelId?: boolean): Chainable;
            uiClickSidebarItem(name: string): Chainable;
            uiGetSidebarItem(name: string): Chainable;
            uiOpenSystemConsoleMenu: typeof uiOpenSystemConsoleMenu;
            uiGetSystemConsoleButton: typeof uiGetSystemConsoleButton;
            uiGetSystemConsoleMenu: typeof uiGetSystemConsoleMenu;
            uiGetSidebarThreadsButton: typeof uiGetSidebarThreadsButton;
        }
    }
}