import * as TIMEOUTS from '../../../fixtures/timeouts';
describe('Keyboard Shortcuts', () => {
    before(() => {
        cy.apiInitSetup({loginAfter: true}).then(({channelUrl}) => {
            cy.visit(channelUrl);
        });
    });
    it('MM-T1255 CTRL/CMD+UP or DOWN no action on draft post', () => {
        const message = 'Test message from User 1';
        cy.uiGetPostTextBox().type(message).wait(TIMEOUTS.ONE_SEC);
        cy.uiGetPostTextBox().cmdOrCtrlShortcut('{downarrow}');
        cy.uiGetPostTextBox().
            should('be.focused').
            and('have.text', message).
            and('have.prop', 'selectionStart', message.length).
            and('have.prop', 'selectionEnd', message.length);
        cy.uiGetPostTextBox().cmdOrCtrlShortcut('{uparrow}');
        cy.uiGetPostTextBox().
            should('be.focused').
            and('have.text', message).
            and('have.prop', 'selectionStart', 0).
            and('have.prop', 'selectionEnd', 0);
    });
});