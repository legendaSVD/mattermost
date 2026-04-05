import * as TIMEOUTS from '../../../../fixtures/timeouts';
import {githubPluginOld} from '../../../../utils/plugins';
describe('Plugin Marketplace', () => {
    let townsquareLink;
    before(() => {
        cy.shouldNotRunOnCloudEdition();
        cy.shouldHaveFeatureFlag('StreamlinedMarketplace', 'false');
        cy.shouldHavePluginUploadEnabled();
        cy.apiInitSetup().then(({team}) => {
            townsquareLink = `/${team.name}/channels/town-square`;
        });
    });
    beforeEach(() => {
        cy.apiUpdateConfig({
            PluginSettings: {
                Enable: true,
                EnableMarketplace: true,
                EnableRemoteMarketplace: true,
                MarketplaceURL: 'https://api.integrations.mattermost.com',
                PluginStates: {
                    github: {
                        Enable: false,
                    },
                    'com.mattermost.webex': {
                        Enable: false,
                    },
                },
            },
        });
        cy.apiUninstallAllPlugins();
        cy.visit(townsquareLink);
        cy.uiOpenProductMenu('Marketplace');
        cy.get('#error_bar').should('not.exist');
        cy.findByPlaceholderText('Search Marketplace').scrollIntoView().should('be.visible');
        cy.get('#marketplaceTabs').should('be.visible');
        cy.get('#marketplaceTabs-tab-allListing').should('be.visible');
        cy.get('#marketplaceTabs-tab-installed').should('be.visible');
        cy.get('#marketplaceTabs-pane-allListing').should('be.visible');
    });
    it('MM-T2001 autofocus on search plugin input box', () => {
        cy.uiClose();
        cy.uiOpenProductMenu('Marketplace');
        cy.findByPlaceholderText('Search Marketplace').should('be.focused');
    });
    it('render the list of all plugins by default', () => {
        cy.get('#marketplaceTabs-tab-allListing').should('be.visible').parent().should('have.class', 'active');
        cy.get('#marketplaceTabs-pane-allListing').should('be.visible');
        cy.get('#marketplaceTabs-tab-installed').should('be.visible').parent().should('not.have.class', 'active');
        cy.get('#marketplaceTabs-pane-installed').should('not.exist');
    });
    it('render the list of installed plugins on demand', () => {
        cy.get('#marketplaceTabs-tab-installed').should('be.visible').click();
        cy.get('#marketplaceTabs-tab-allListing').should('be.visible').parent().should('not.have.class', 'active');
        cy.get('#marketplaceTabs-pane-allListing').should('not.exist');
        cy.get('#marketplaceTabs-tab-installed').should('be.visible').parent().should('have.class', 'active');
        cy.get('#marketplaceTabs-pane-installed').should('be.visible');
    });
    it('should close the modal on demand', () => {
        cy.get('#modal_marketplace').should('be.visible');
        cy.uiClose();
        cy.get('#modal_marketplace').should('not.exist');
    });
    it('should filter all on search', () => {
        cy.get('.more-modal__row').should('have.length', 15);
        cy.findByPlaceholderText('Search Marketplace').
            scrollIntoView().
            should('be.visible').
            type('jira');
        cy.get('#marketplace-plugin-jira').should('be.visible');
        cy.get('#marketplaceTabs-pane-allListing').
            find('.more-modal__row').
            should('have.length', 1);
    });
    it('should show an error bar on failing to filter', () => {
        cy.apiUpdateConfig({
            PluginSettings: {
                Enable: true,
                EnableMarketplace: true,
                MarketplaceURL: 'example.com',
            },
        });
        cy.findByPlaceholderText('Search Marketplace').scrollIntoView().should('be.visible').type('jira');
        cy.get('#error_bar').contains('Error connecting to the marketplace server');
    });
    it('should install a plugin on demand', () => {
        cy.apiRemovePluginById('com.mattermost.webex');
        cy.findByText('Next').click();
        cy.get('#marketplace-plugin-com\\.mattermost\\.webex').scrollIntoView().should('be.visible');
        cy.get('#marketplace-plugin-com\\.mattermost\\.webex').find('.btn.btn-primary').click();
        cy.get('#marketplace-plugin-com\\.mattermost\\.webex').find('.btn.btn-outline', {timeout: TIMEOUTS.ONE_MIN}).scrollIntoView().should('be.visible').and('have.text', 'Configure');
    });
    it('should install a plugin from search results on demand', () => {
        cy.apiRemovePluginById('com.mattermost.webex');
        cy.findByPlaceholderText('Search Marketplace').scrollIntoView().should('be.visible').type('webex');
        cy.get('#marketplaceTabs-pane-allListing').find('.more-modal__row').should('have.length', 1);
        cy.get('#marketplace-plugin-com\\.mattermost\\.webex').scrollIntoView().should('be.visible');
        cy.get('#marketplace-plugin-com\\.mattermost\\.webex').find('.btn.btn-primary').click();
        cy.get('#marketplace-plugin-com\\.mattermost\\.webex').find('.btn.btn-outline', {timeout: TIMEOUTS.ONE_MIN}).scrollIntoView().should('be.visible').and('have.text', 'Configure');
        cy.get('#marketplaceTabs-pane-allListing').find('.more-modal__row').should('have.length', 1);
    });
    it('should prompt to update an old GitHub plugin from all plugins', () => {
        cy.apiInstallPluginFromUrl(githubPluginOld.url, true);
        cy.get('#marketplace-plugin-github').scrollIntoView().should('be.visible');
        cy.get('#marketplace-plugin-github').find('.update').should('be.visible').and('to.contain', 'Update available');
        cy.get('#marketplace-plugin-github').find('.update b a').should('be.visible').and('have.text', 'Update');
        cy.get('#marketplace-plugin-github .update b a').click();
        cy.get('#confirmModal').should('be.visible');
        cy.get('#confirmModal').find('.btn.btn-primary').click();
        cy.get('#confirmModal').should('not.exist');
        cy.get('#marketplace-plugin-github').find('.update').should('not.exist');
        cy.get('#marketplace-plugin-github').find('.btn.btn-outline', {timeout: TIMEOUTS.ONE_MIN}).scrollIntoView().should('be.visible').and('have.text', 'Configure');
        cy.get('#marketplace-plugin-github').should('be.visible');
    });
    it('MM-T1986 change tab to "All Plugins" when "Install Plugins" link is clicked', () => {
        cy.get('#marketplaceTabs').scrollIntoView().should('be.visible').within(() => {
            cy.findByRole('tab', {name: /Installed/}).should('be.visible').and('have.attr', 'aria-selected', 'false').click();
            cy.get('#marketplaceTabs-tab-allListing').should('be.visible').parent().should('not.have.class', 'active');
            cy.get('#marketplaceTabs-tab-installed').should('be.visible').parent().should('have.class', 'active');
            cy.findByText('Install Plugins').should('be.visible').click();
            cy.findByRole('tab', {name: 'All'}).should('be.visible').and('have.attr', 'aria-selected', 'true');
            cy.get('#marketplaceTabs-tab-allListing').should('be.visible').parent().should('have.class', 'active');
            cy.get('#marketplaceTabs-tab-installed').should('be.visible').parent().should('not.have.class', 'active');
        });
    });
});