describe('Keyboard Shortcuts', () => {
    before(() => {
        cy.apiInitSetup().then(({channelUrl}) => {
            cy.visit(channelUrl);
        });
    });
    it('MM-T1242 - CTRL/CMD+K - Typed characters are not lost after switching channels', () => {
        const message = 'Hello World!';
        cy.uiGetPostTextBox().cmdOrCtrlShortcut('K');
        cy.get('#suggestionList').should('be.visible');
        cy.get('#quickSwitchInput').type('{enter}');
        cy.get('body').type(message);
        cy.uiGetPostTextBox().should('have.text', message);
    });
});