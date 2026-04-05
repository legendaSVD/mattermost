import {Bot} from '@mattermost/types/bots';
import {Channel} from '@mattermost/types/channels';
import {Team} from '@mattermost/types/teams';
import {UserProfile} from '@mattermost/types/users';
import {createBotPatch} from '../../../support/api/bots';
import {generateRandomUser} from '../../../support/api/user';
import * as TIMEOUTS from '../../../fixtures/timeouts';
describe('Bots in lists', () => {
    let team: Team;
    let channel: Channel;
    let bots: Bot[];
    let createdUsers: UserProfile[];
    before(() => {
        cy.apiInitSetup().then((out) => {
            team = out.team;
            channel = out.channel;
        });
        cy.makeClient().then(async (client) => {
            bots = await Promise.all([
                client.createBot(createBotPatch()),
                client.createBot(createBotPatch()),
                client.createBot(createBotPatch()),
            ]);
            createdUsers = await Promise.all([
                client.createUser(generateRandomUser() as UserProfile, '', ''),
                client.createUser(generateRandomUser() as UserProfile, '', ''),
            ]);
            await Promise.all([
                ...bots,
                ...createdUsers,
            ].map(async (user) => {
                cy.wrap(user).its('username');
                await client.addToTeam(team.id, (user as Bot).user_id ?? (user as UserProfile).id);
                await client.addToChannel((user as Bot).user_id ?? (user as UserProfile).id, channel.id);
            }));
        });
    });
    it('MM-T1834 Bots are not listed on “Users” list in System Console > Users', () => {
        cy.visit('/admin_console/user_management/users');
        bots.forEach(({username}) => {
            cy.get('#input_searchTerm').clear().type(`${username}`).wait(TIMEOUTS.ONE_SEC);
            cy.get('.noRows').should('have.text', 'No data');
            cy.get('.adminConsoleListTabletOptionalHead > span').should('have.text', '0 users').should('be.visible');
        });
    });
});