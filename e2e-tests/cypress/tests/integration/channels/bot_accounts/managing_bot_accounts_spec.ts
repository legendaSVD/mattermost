import {Team} from '@mattermost/types/teams';
import * as TIMEOUTS from '../../../fixtures/timeouts';
import {getRandomId} from '../../../utils';
describe('Managing bot accounts', () => {
    let newTeam: Team;
    before(() => {
        cy.apiInitSetup().then(({team}) => {
            newTeam = team;
        });
    });
    beforeEach(() => {
        cy.apiAdminLogin();
        const newSettings = {
            ServiceSettings: {
                EnableBotAccountCreation: true,
            },
        };
        cy.apiUpdateConfig(newSettings);
    });
    it('MM-T1851 No option to create BOT accounts when Enable Bot Account Creation is set to False.', () => {
        cy.visit('/admin_console/integrations/bot_accounts');
        cy.findByTestId('ServiceSettings.EnableBotAccountCreationfalse', {timeout: TIMEOUTS.ONE_MIN}).click();
        cy.findByTestId('saveSetting').should('be.enabled').click();
        cy.visit(`/${newTeam.name}/integrations/bots`);
        cy.get('#addBotAccount', {timeout: TIMEOUTS.ONE_MIN}).should('not.exist');
    });
    it('MM-T1852 Bot creation via API is not permitted when Enable Bot Account Creation is set to False', () => {
        cy.visit('/admin_console/integrations/bot_accounts');
        cy.findByTestId('ServiceSettings.EnableBotAccountCreationfalse', {timeout: TIMEOUTS.ONE_MIN}).click();
        cy.findByTestId('saveSetting').should('be.enabled').click().wait(TIMEOUTS.HALF_SEC);
        cy.request({
            headers: {'X-Requested-With': 'XMLHttpRequest'},
            url: '/api/v4/bots',
            method: 'POST',
            failOnStatusCode: false,
            body: {
                username: `bot-${getRandomId()}`,
                display_name: 'test bot',
                description: 'test bot',
            },
        }).then((response) => {
            expect(response.status).to.equal(403);
            expect(response.body.message).to.equal('Bot creation has been disabled.');
            return cy.wrap(response);
        });
    });
    it('MM-T1854 Bots can be create when Enable Bot Account Creation is set to True.', () => {
        cy.visit('/admin_console/integrations/bot_accounts');
        cy.findByTestId('ServiceSettings.EnableBotAccountCreationtrue', {timeout: TIMEOUTS.ONE_MIN}).should('be.checked');
        cy.visit(`/${newTeam.name}/integrations/bots`);
        cy.get('#addBotAccount', {timeout: TIMEOUTS.ONE_MIN}).should('be.visible');
    });
    it('MM-T1856 Disable Bot', () => {
        cy.apiCreateBot({prefix: 'test-bot'}).then(({bot}) => {
            cy.visit(`/${newTeam.name}/integrations/bots`);
            cy.get('#searchInput', {timeout: TIMEOUTS.ONE_MIN}).type(bot.username);
            cy.findByText(bot.fullDisplayName, {timeout: TIMEOUTS.ONE_MIN}).scrollIntoView().then((el) => {
                cy.wrap(el[0].parentElement.parentElement).find('button:nth-child(3)').should('be.visible').click();
            });
            cy.get('.bot-list__disabled').scrollIntoView().findByText(bot.fullDisplayName).should('be.visible');
        });
    });
    it('MM-T1857 Enable Bot', () => {
        cy.apiCreateBot({prefix: 'test-bot'}).then(({bot}) => {
            cy.visit(`/${newTeam.name}/integrations/bots`);
            cy.findByText(bot.fullDisplayName, {timeout: TIMEOUTS.ONE_MIN}).scrollIntoView().then((el) => {
                cy.wrap(el[0].parentElement.parentElement).find('button:nth-child(3)').should('be.visible').click();
            });
            cy.get('#searchInput', {timeout: TIMEOUTS.ONE_MIN}).type(bot.username);
            cy.get('.bot-list__disabled').scrollIntoView().findByText(bot.fullDisplayName, {timeout: TIMEOUTS.ONE_MIN}).scrollIntoView().then((el) => {
                cy.wrap(el[0].parentElement.parentElement).find('button:nth-child(1)').should('be.visible').click();
            });
            cy.findByText(bot.fullDisplayName).scrollIntoView().should('be.visible');
            cy.get('.bot-list__disabled').should('not.exist');
        });
    });
    it('MM-T1858 Search active and disabled Bot accounts', () => {
        cy.apiCreateBot({prefix: 'hello-bot'}).then(({bot}) => {
            cy.visit(`/${newTeam.name}/integrations/bots`);
            cy.findByText(bot.fullDisplayName, {timeout: TIMEOUTS.ONE_MIN}).then((el) => {
                cy.wrap(el[0].parentElement.parentElement).scrollIntoView();
                cy.wrap(el[0].parentElement.parentElement).find('button:nth-child(3)').should('be.visible').click();
            });
            cy.get('.bot-list__disabled').scrollIntoView().should('be.visible');
            cy.apiCreateBot({prefix: 'other-bot'}).then(({bot: otherBot}) => {
                cy.get('#searchInput').type(otherBot.username);
                cy.get('.bot-list__disabled').should('not.exist');
            });
        });
    });
    it('MM-T1860 Bot is disabled when owner is deactivated', () => {
        cy.apiCreateCustomAdmin().then(({sysadmin}) => {
            cy.apiLogin(sysadmin);
            cy.apiCreateBot({prefix: 'stay-enabled-bot'}).then(({bot}) => {
                cy.apiAdminLogin();
                cy.apiDeactivateUser(sysadmin.id);
                cy.visit(`/${newTeam.name}/integrations/bots`);
                cy.get('#searchInput', {timeout: TIMEOUTS.ONE_MIN}).type(bot.display_name);
                cy.get('.bot-list__disabled').scrollIntoView().findByText(bot.fullDisplayName).scrollIntoView().should('be.visible');
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
});