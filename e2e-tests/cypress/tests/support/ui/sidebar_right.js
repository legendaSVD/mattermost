Cypress.Commands.add('uiGetRHS', (options = {visible: true}) => {
    if (options.visible) {
        return cy.get('#sidebar-right').should('be.visible');
    }
    return cy.get('#sidebar-right').should('not.be.exist');
});
Cypress.Commands.add('uiCloseRHS', () => {
    cy.document().then((doc) => {
        const closeButton = doc.querySelector('[aria-label="Close Sidebar Icon"]');
        if (closeButton) {
            closeButton.click();
        }
    });
});
Cypress.Commands.add('uiExpandRHS', () => {
    cy.findByLabelText('Expand Sidebar Icon').click();
});
Cypress.Commands.add('isExpanded', {prevSubject: true}, (subject) => {
    return cy.get(subject).should('have.class', 'sidebar--right--expanded');
});
Cypress.Commands.add('uiGetReply', () => {
    return cy.get('#sidebar-right').findByTestId('SendMessageButton');
});
Cypress.Commands.add('uiReply', () => {
    cy.uiGetReply().click();
});
Cypress.Commands.add('uiGetRHSSearchContainer', (options = {visible: true}) => {
    if (options.visible) {
        return cy.get('#searchContainer').should('be.visible');
    }
    return cy.get('#searchContainer').should('not.exist');
});
Cypress.Commands.add('uiGetFileFilterButton', () => {
    return cy.get('.FilesFilterMenu').should('be.visible');
});
Cypress.Commands.add('uiGetFileFilterMenu', (option = {exist: true}) => {
    if (option.exist) {
        return cy.get('.FilesFilterMenu').
            find('.dropdown-menu').
            should('be.visible');
    }
    return cy.get('.FilesFilterMenu').
        find('.dropdown-menu').
        should('not.exist');
});
Cypress.Commands.add('uiOpenFileFilterMenu', (item = '') => {
    cy.uiGetFileFilterButton().click();
    if (!item) {
        return cy.uiGetFileFilterMenu();
    }
    return cy.uiGetFileFilterMenu().
        findByText(item).
        should('be.visible').
        click();
});