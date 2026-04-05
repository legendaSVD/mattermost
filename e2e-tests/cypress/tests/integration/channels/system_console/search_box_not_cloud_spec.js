import * as TIMEOUTS from '../../../fixtures/timeouts';
describe('System console', () => {
    before(() => {
        cy.shouldNotRunOnCloudEdition();
        cy.shouldHavePluginUploadEnabled();
    });
    it('MM-T898 - Individual plugins can be searched for via the System Console search box', () => {
        cy.visit('/admin_console');
        cy.apiUpdateConfig({
            PluginSettings: {
                Enable: true,
                EnableMarketplace: true,
                EnableRemoteMarketplace: true,
                MarketplaceURL: 'https://api.integrations.mattermost.com',
            },
        });
        cy.apiInstallPluginFromUrl('https://github.com/mattermost/mattermost-plugin-antivirus/releases/download/v0.1.2/antivirus-0.1.2.tar.gz', true);
        cy.apiInstallPluginFromUrl('https://github.com/mattermost/mattermost-plugin-autolink/releases/download/v1.2.1/mattermost-autolink-1.2.1.tar.gz', true);
        cy.apiInstallPluginFromUrl('https://github.com/mattermost/mattermost-plugin-aws-SNS/releases/download/v1.1.0/com.mattermost.aws-sns-1.1.0.tar.gz', true);
        cy.visit('ad-1/channels/town-square');
        cy.visit('/admin_console');
        cy.get('#adminSidebarFilter').type('Anti');
        cy.wait(TIMEOUTS.ONE_SEC);
        cy.get('#plugins\\/plugin_antivirus').then((el) => {
            expect(el[0].innerHTML).includes('markjs');
        });
        cy.get('#adminSidebarFilter').clear().type('Auto');
        cy.wait(TIMEOUTS.ONE_SEC);
        cy.get('#plugins\\/plugin_mattermost-autolink').then((el) => {
            expect(el[0].innerHTML).includes('markjs');
        });
        cy.get('#adminSidebarFilter').clear().type('AWS SN');
        cy.wait(TIMEOUTS.ONE_SEC);
        cy.get('#plugins\\/plugin_com\\.mattermost\\.aws-sns').then((el) => {
            expect(el[0].innerHTML).includes('markjs');
        });
        cy.apiUninstallAllPlugins();
    });
});