import {Team} from '@mattermost/types/teams';
import {createBotPatch} from '../../../support/api/bots';
describe('Managing bots in Teams and Channels', () => {
    let team: Team;
    before(() => {
        cy.apiUpdateConfig({
            TeamSettings: {
                RestrictCreationToDomains: 'sample.mattermost.com',
            },
        });
        cy.apiInitSetup({loginAfter: true}).then((out) => {
            team = out.team;
        });
    });
    it('MM-T1819 Promote a BOT to team admin', () => {
        cy.makeClient().then(async (client) => {
            const channel = await client.getChannelByName(team.id, 'off-topic');
            cy.visit(`/${team.name}/channels/${channel.name}`);
            const bot = await client.createBot(createBotPatch());
            await client.addToTeam(team.id, bot.user_id);
            cy.uiOpenTeamMenu('Manage members');
            cy.get('.more-modal__list').find('.more-modal__row').its('length').should('be.gt', 0);
            cy.get('#searchUsersInput').type(bot.username);
            cy.get('#teamMembersModal .loading-screen').should('be.visible');
            cy.get(`#teamMembersDropdown_${bot.username}`).as('memberDropdown').should('contain.text', 'Member').click();
            cy.get('li').contains('Make Team Admin').click();
            cy.get('@memberDropdown').should('contain.text', 'Team Admin');
        });
    });
});