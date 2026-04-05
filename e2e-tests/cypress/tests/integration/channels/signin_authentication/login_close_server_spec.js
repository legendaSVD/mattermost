describe('Login page with close server', () => {
    const oldSettings = {};
    before(() => {
        const newSettings = {
            Office365Settings: {Enable: false},
            LdapSettings: {Enable: false},
            TeamSettings: {EnableOpenServer: false},
        };
        cy.apiGetConfig((config) => {
            Object.entries(newSettings).forEach(([key]) => {
                oldSettings[key] = config[key];
            });
        });
        cy.apiUpdateConfig(newSettings);
        cy.apiInitSetup().then(() => {
            cy.apiLogout();
            cy.visit('/login');
        });
    });
    after(() => {
        cy.apiAdminLogin().apiUpdateConfig(oldSettings);
    });
    it('MM-47222 Should verify access problem page can be reached', () => {
        cy.findByText('Don\'t have an account?').should('be.visible').click();
        cy.findByText('Contact your workspace admin').should('be.visible');
    });
});