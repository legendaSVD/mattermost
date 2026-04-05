describe('Keyboard Shortcuts', () => {
    before(() => {
        cy.apiInitSetup({loginAfter: true}).then(({offTopicUrl}) => {
            cy.visit(offTopicUrl);
            cy.postMessage('Hello World');
        });
    });
    it('MM-T1277 SHIFT+UP', () => {
        cy.uiGetPostTextBox().type('{shift+uparrow}', {delay: 50});
        cy.get('.sidebar--right__header').should('be.visible');
        cy.uiGetReplyTextBox().should('be.focused');
        cy.uiGetPostTextBox().click();
        cy.uiGetPostTextBox().type('{shift+uparrow}', {delay: 50});
        cy.uiGetReplyTextBox().should('be.focused');
        cy.uiGetReplyTextBox().type('This is a reply{enter}');
        cy.get('#rhsCloseButton').click();
        cy.get('.sidebar--right__header').should('not.exist');
        cy.uiGetPostTextBox().click();
        cy.uiGetPostTextBox().type('{shift+uparrow}', {delay: 50});
        cy.get('.sidebar--right__header').should('be.visible');
        cy.uiGetReplyTextBox().should('be.focused');
    });
});