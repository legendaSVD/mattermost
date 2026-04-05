import {Team} from '@mattermost/types/teams';
import * as TIMEOUTS from '../../../fixtures/timeouts';
import {matterpollPlugin} from '../../../utils/plugins';
describe('Managing bot accounts', () => {
    let newTeam: Team;
    before(() => {
        cy.shouldNotRunOnCloudEdition();
        cy.shouldHavePluginUploadEnabled();
        cy.apiInitSetup().then(({team}) => {
            newTeam = team;
        });
    });
    beforeEach(() => {
        cy.apiAdminLogin();
    });
    it('MM-T1859 Bot is kept active when owner is disabled', () => {
        cy.visit('/admin_console/integrations/bot_accounts');
        cy.findByTestId('ServiceSettings.DisableBotsWhenOwnerIsDeactivatedfalse', {timeout: TIMEOUTS.ONE_MIN}).click();
        cy.findByTestId('saveSetting').should('be.enabled').click();
        cy.apiCreateCustomAdmin().then(({sysadmin}) => {
            cy.apiLogin(sysadmin);
            cy.apiCreateBot({prefix: 'stay-enabled-bot'}).then(({bot}) => {
                cy.apiAdminLogin();
                cy.apiDeactivateUser(sysadmin.id);
                cy.visit(`/${newTeam.name}/integrations/bots`);
                cy.get('#searchInput', {timeout: TIMEOUTS.ONE_MIN}).type(bot.display_name);
                cy.get('.bot-list__disabled').should('not.exist');
                cy.findByText(bot.fullDisplayName).scrollIntoView().should('be.visible');
                cy.visit(`/${newTeam.name}/messages/@sysadmin`);
                cy.getLastPostId().then((postId) => {
                    cy.get(`#postMessageText_${postId}`).as('postMessageText');
                });
                cy.get('@postMessageText').
                    should('be.visible').
                    and('contain.text', `${sysadmin.username} was deactivated. They managed the following bot accounts`).
                    and('contain.text', bot.username);
            });
        });
    });
    it.skip('MM-T1853 Bots managed plugins can be created when Enable Bot Account Creation is set to false', () => {
        cy.apiUploadAndEnablePlugin(matterpollPlugin);
        cy.visit('/admin_console/integrations/bot_accounts');
        cy.findByTestId('ServiceSettings.EnableBotAccountCreationfalse', {timeout: TIMEOUTS.ONE_MIN}).click();
        cy.findByTestId('saveSetting').should('be.enabled').click();
        cy.visit(`/${newTeam.name}/integrations/bots`);
        cy.contains('Matterpoll (@matterpoll)', {timeout: TIMEOUTS.ONE_MIN});
    });
});