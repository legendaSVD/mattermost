Cypress.Commands.add('uiGetToolTip', (text) => {
    cy.findByRole('tooltip').should('exist').and('contain', text);
});