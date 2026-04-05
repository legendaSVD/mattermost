import {githubPlugin} from '../../../../utils/plugins';
describe('Plugin Marketplace', () => {
    let townsquareLink;
    before(() => {
        cy.shouldNotRunOnCloudEdition();
        cy.shouldHavePluginUploadEnabled();
        cy.apiUninstallAllPlugins();
        cy.apiInitSetup().then(({team}) => {
            townsquareLink = `/${team.name}/channels/town-square`;
        });
    });
    beforeEach(() => {
        cy.apiUpdateConfig({
            PluginSettings: {
                Enable: true,
                EnableMarketplace: true,
                EnableRemoteMarketplace: false,
                AutomaticPrepackagedPlugins: false,
            },
        });
        cy.visit(townsquareLink);
        cy.uiOpenProductMenu('Marketplace');
    });
    it('not display any plugins and no error bar', () => {
        cy.get('#marketplaceTabs-pane-allListing').findByText('There are no plugins available at this time.');
        cy.get('#error_bar').should('not.exist');
    });
    it('MM-T1979 display installed plugins', () => {
        cy.apiInstallPluginFromUrl(githubPlugin.url);
        cy.get('#marketplace-plugin-github').scrollIntoView().should('be.visible');
        cy.uiCloseAnnouncementBar().then(() => {
            cy.get('#marketplaceTabs-tab-installed').scrollIntoView().should('be.visible').click();
            cy.get('#marketplaceTabs-pane-installed').find('.more-modal__row').should('have.length', 1);
        });
        cy.get('#error_bar').should('not.exist');
    });
});