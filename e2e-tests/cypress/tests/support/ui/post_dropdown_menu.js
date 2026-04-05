import {stubClipboard} from '../../utils';
Cypress.Commands.add('uiClickCopyLink', (permalink, postId) => {
    stubClipboard().as('clipboard');
    cy.get('@clipboard').its('contents').should('eq', '');
    cy.get(`#CENTER_dropdown_${postId}`).should('be.visible').within(() => {
        cy.findByText('Copy Link').scrollIntoView().should('be.visible').click();
        cy.get('@clipboard').its('wasCalled').should('eq', true);
        cy.get('@clipboard').its('contents').should('eq', permalink);
    });
});
Cypress.Commands.add('uiClickPostDropdownMenu', (postId, menuItem, location = 'CENTER') => {
    cy.clickPostDotMenu(postId, location);
    cy.findAllByTestId(`unread_post_${postId}`).eq(0).should('be.visible');
    cy.findByText(menuItem).scrollIntoView().should('be.visible').click({force: true});
});
Cypress.Commands.add('uiPostDropdownMenuShortcut', (postId, menuText, shortcutKey, location = 'CENTER') => {
    cy.clickPostDotMenu(postId, location);
    cy.findByText(menuText).scrollIntoView().should('be.visible');
    cy.get('body').type(shortcutKey);
});