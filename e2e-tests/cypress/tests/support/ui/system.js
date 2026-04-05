import * as TIMEOUTS from '../../fixtures/timeouts';
Cypress.Commands.add('uiCheckLicenseExists', () => {
    cy.visit('/admin_console/about/license');
    cy.url().should('include', '/admin_console/about/license');
    cy.get('.admin-console', {timeout: TIMEOUTS.HALF_MIN}).should('be.visible').within(() => {
        cy.get('.admin-console__header').should('be.visible').and('have.text', 'Edition and License');
        cy.get('.admin-console__content').should('be.visible').and('not.contain', 'undefined').and('not.contain', 'Invalid');
        cy.get('#remove-button').should('be.visible');
    });
});
Cypress.Commands.add('uiResetPermissionsToDefault', () => {
    cy.visit('/admin_console/user_management/permissions/system_scheme');
    cy.findByTestId('resetPermissionsToDefault', {timeout: TIMEOUTS.HALF_MIN}).click();
    cy.get('#confirmModalButton').click();
    cy.uiSaveConfig();
});
Cypress.Commands.add('uiSaveConfig', ({confirm = true} = {}) => {
    cy.get('#saveSetting').should('be.enabled').click();
    cy.wait(TIMEOUTS.HALF_SEC);
    if (confirm) {
        cy.waitUntil(() => cy.get('#saveSetting').then((el) => {
            return el[0].innerText === 'Save';
        }));
    } else {
        cy.wait(TIMEOUTS.HALF_SEC);
    }
});