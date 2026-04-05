import * as TIMEOUTS from '../../../../fixtures/timeouts';
import {verifyPluginMarketplaceVisibility} from './helpers';
describe('Plugin Marketplace', () => {
    let townsquareLink;
    let pluginManagementPage;
    before(() => {
        cy.apiInitSetup().then(({team}) => {
            townsquareLink = `/${team.name}/channels/town-square`;
            pluginManagementPage = '/admin_console/plugins/plugin_management';
        });
    });
    it('MM-T1960 Marketplace is available when "Enable Plugins" is true', () => {
        cy.apiUpdateConfig({
            PluginSettings: {
                Enable: false,
                EnableMarketplace: true,
                MarketplaceURL: 'https://api.integrations.mattermost.com',
            },
        });
        cy.visit(pluginManagementPage);
        cy.wait(TIMEOUTS.HALF_SEC).get('input[data-testid="enablefalse"]').should('be.checked');
        cy.get('input[data-testid="enabletrue"]').check();
        cy.get('#saveSetting').click();
        cy.visit(townsquareLink);
        verifyPluginMarketplaceVisibility(true);
    });
    it('MM-T1958 Marketplace is available when "Enable Marketplace" is set to true', () => {
        cy.apiUpdateConfig({
            PluginSettings: {
                Enable: true,
                EnableMarketplace: false,
                MarketplaceURL: 'https://api.integrations.mattermost.com',
            },
        });
        cy.visit(pluginManagementPage);
        cy.wait(TIMEOUTS.HALF_SEC).get('input[data-testid="enableMarketplacefalse"]').should('be.checked');
        cy.get('input[data-testid="enableMarketplacetrue"]').check();
        cy.get('#saveSetting').click();
        cy.visit(townsquareLink);
        verifyPluginMarketplaceVisibility(true);
    });
});