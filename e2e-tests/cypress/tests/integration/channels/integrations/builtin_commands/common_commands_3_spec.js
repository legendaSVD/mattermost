import * as TIMEOUTS from '../../../../fixtures/timeouts';
describe('Integrations', () => {
    before(() => {
        cy.apiInitSetup({loginAfter: true}).then(() => {
            cy.visit('/');
            cy.postMessage('hello');
        });
    });
    it('MM-T686 /logout', () => {
        cy.uiGetPostTextBox().should('be.visible').clear().type('/logout {enter}').wait(TIMEOUTS.HALF_SEC);
        cy.url().should('include', '/login');
    });
});