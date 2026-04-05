import * as TIMEOUTS from '../../../fixtures/timeouts';
describe('Messaging', () => {
    before(() => {
        cy.apiInitSetup({loginAfter: true}).then(({team}) => {
            cy.visit(`/${team.name}/channels/off-topic`);
        });
    });
    it('MM-T96 Trying to type in middle of text should not send the cursor to end of textbox', () => {
        cy.uiGetPostTextBox().clear().type('aa');
        cy.uiGetPostTextBox().click().type('{leftarrow}b');
        cy.wait(TIMEOUTS.FIVE_SEC);
        cy.uiGetPostTextBox().type('c');
        cy.uiGetPostTextBox().should('contain', 'abca');
    });
});