export function enableUsernameAndIconOverride(enable) {
    enableUsernameAndIconOverrideInt(enable, enable);
}
export function enableUsernameAndIconOverrideInt(enableUsername, enableIcon) {
    cy.visit('/admin_console/integrations/integration_management');
    cy.findByTestId('ServiceSettings.EnablePostUsernameOverride' + enableUsername).check({force: true});
    cy.findByTestId('ServiceSettings.EnablePostIconOverride' + enableIcon).check({force: true});
    cy.get('#saveSetting').should('be.enabled').click({force: true});
    cy.get('#saveSetting').should('be.disabled');
}