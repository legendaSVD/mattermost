describe('Password settings', () => {
    it('MM-T4679 - Should NOT show MaximumLoginAttempts when ExperimentalSettings.RestrictSystemAdmin is true', () => {
        cy.apiUpdateConfig({
            ExperimentalSettings: {
                RestrictSystemAdmin: true,
            },
        }).then(() => {
            cy.visit('/admin_console/authentication/password');
            cy.get('#maximumLoginAttempts').should('not.exist');
        });
    });
});