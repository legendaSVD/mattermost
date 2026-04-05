import {githubPlugin} from '../../../../utils/plugins';
describe('Plugin Marketplace', () => {
    let townsquareLink;
    before(() => {
        cy.shouldNotRunOnCloudEdition();
        cy.shouldHavePluginUploadEnabled();
        cy.apiInitSetup().then(({team}) => {
            townsquareLink = `/${team.name}/channels/town-square`;
        });
    });
    beforeEach(() => {
        cy.apiAdminLogin();
        cy.apiUpdateConfig({
            PluginSettings: {
                Enable: true,
                EnableMarketplace: true,
                EnableRemoteMarketplace: true,
                MarketplaceURL: 'example.com',
            },
        });
        cy.apiUninstallAllPlugins();
        cy.visit(townsquareLink);
        cy.uiOpenProductMenu('Marketplace');
    });
    it('render an error bar', () => {
        cy.get('#error_bar').contains('Error connecting to the marketplace server');
    });
    it('show an error bar on failing to filter', () => {
        cy.apiUpdateConfig({
            PluginSettings: {
                Enable: true,
                EnableMarketplace: true,
                MarketplaceURL: 'example.com',
            },
        });
        cy.get('#searchMarketplaceTextbox').typeWithForce('jira');
        cy.get('#error_bar').contains('Error connecting to the marketplace server');
    });
    it('display installed plugins and error bar', () => {
        cy.apiInstallPluginFromUrl(githubPlugin.url, true);
        cy.get('#marketplace-plugin-github').scrollIntoView().should('be.visible');
        cy.get('#marketplaceTabs-tab-installed').scrollIntoView().should('be.visible').click();
        cy.get('#marketplaceTabs-pane-installed').find('.more-modal__row').should('have.length', 1);
        cy.get('#error_bar').contains('Error connecting to the marketplace server');
    });
});