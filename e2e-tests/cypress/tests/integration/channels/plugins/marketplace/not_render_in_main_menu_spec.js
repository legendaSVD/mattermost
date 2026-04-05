import {verifyPluginMarketplaceVisibility} from './helpers';
describe('Plugin Marketplace', () => {
    let townsquareLink;
    let regularUser;
    before(() => {
        cy.apiInitSetup().then(({team, user}) => {
            regularUser = user;
            townsquareLink = `/${team.name}/channels/town-square`;
        });
    });
    beforeEach(() => {
        cy.apiAdminLogin();
    });
    it('MM-T1952 Plugin Marketplace is not available to normal users', () => {
        cy.apiUpdateConfig({
            PluginSettings: {
                Enable: true,
                EnableMarketplace: true,
                MarketplaceURL: 'https://api.integrations.mattermost.com',
            },
        });
        cy.apiLogin(regularUser);
        cy.visit(townsquareLink);
        verifyPluginMarketplaceVisibility(false);
    });
    it('MM-T1957 Marketplace is not available when "Enable Marketplace" is set to false', () => {
        cy.apiUpdateConfig({
            PluginSettings: {
                Enable: true,
                EnableMarketplace: false,
                MarketplaceURL: 'https://api.integrations.mattermost.com',
            },
        });
        cy.visit(townsquareLink);
        verifyPluginMarketplaceVisibility(false);
    });
    it('MM-T1959 Marketplace is not available when "Enable Plugins" is false', () => {
        cy.apiUpdateConfig({
            PluginSettings: {
                Enable: false,
                EnableMarketplace: true,
                MarketplaceURL: 'https://api.integrations.mattermost.com',
            },
        });
        cy.visit(townsquareLink);
        verifyPluginMarketplaceVisibility(false);
    });
});