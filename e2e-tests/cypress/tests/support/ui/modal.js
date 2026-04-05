import * as TIMEOUTS from '../../fixtures/timeouts';
Cypress.Commands.add('uiCloseModal', (headerLabel) => {
    cy.get('#genericModalLabel', {timeout: TIMEOUTS.HALF_MIN}).should('have.text', headerLabel).parents().find('.modal-dialog').findByLabelText('Close').click();
});