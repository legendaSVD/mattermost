import {Team} from '@mattermost/types/teams';
import * as TIMEOUTS from '../../../fixtures/timeouts';
describe('Bot accounts ownership and API', () => {
    let newTeam: Team;
    before(() => {
        cy.shouldNotRunOnCloudEdition();
        cy.apiInitSetup({
            promoteNewUserAsAdmin: true,
            loginAfter: true,
        }).then(({team}) => {
            newTeam = team;
        });
        const newSettings = {
            ServiceSettings: {
                DisableBotsWhenOwnerIsDeactivated: true,
            },
        };
        cy.apiUpdateConfig(newSettings);
    });
    it('MM-T1861 Bots do not re-enable if the owner is re-activated', () => {
        cy.apiCreateCustomAdmin().then(({sysadmin}) => {
            cy.apiLogin(sysadmin);
            cy.apiCreateBot({prefix: 'stay-enabled-bot'}).then(({bot}) => {
                cy.apiAdminLogin();
                cy.apiDeactivateUser(sysadmin.id);
                cy.visit(`/${newTeam.name}/integrations/bots`);
                cy.get('#searchInput', {timeout: TIMEOUTS.ONE_MIN}).type(bot.username);
                cy.get('.bot-list__disabled').scrollIntoView().should('be.visible');
                cy.apiActivateUser(sysadmin.id);
                cy.visit(`/${newTeam.name}/integrations/bots`);
                cy.get('#searchInput', {timeout: TIMEOUTS.ONE_MIN}).type(bot.username);
                cy.get('.bot-list__disabled').scrollIntoView().should('be.visible');
            });
        });
    });
});