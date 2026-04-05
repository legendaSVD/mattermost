Cypress.Commands.add('uiLogin', (user = {}) => {
    cy.url().should('include', '/login');
    cy.get('#input_loginId').should('be.visible').type(user.email);
    cy.get('#input_password-input').should('be.visible').type(user.password);
    cy.get('#saveSetting').should('not.be.disabled').click();
});