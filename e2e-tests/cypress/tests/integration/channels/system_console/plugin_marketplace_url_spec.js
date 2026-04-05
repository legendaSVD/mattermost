describe('System Console > Plugin Management ', () => {
    before(() => {
        cy.shouldNotRunOnCloudEdition();
    });
    it('MM-T4742 Plugin Marketplace URL should be disabled if EnableUploads are disabled', () => {
        const newSettings = {
            PluginSettings: {
                Enable: true,
            },
        };
        cy.apiUpdateConfig(newSettings);
        cy.exec('tests/fixtures/mmctl --local config set PluginSettings.EnableUploads false');
        cy.visit('/admin_console/plugins/plugin_management');
        cy.findByTestId('marketplaceUrlinput').should('be.disabled');
        cy.exec('tests/fixtures/mmctl --local config set PluginSettings.EnableUploads true');
        cy.reload();
        cy.findByTestId('marketplaceUrlinput').should('be.enabled');
    });
});