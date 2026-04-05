Cypress.Commands.add('findByRoleExtended', (role, {name}) => {
    const re = RegExp(name, 'i');
    return cy.findByRole(role, {name: re}).should('have.text', name);
});