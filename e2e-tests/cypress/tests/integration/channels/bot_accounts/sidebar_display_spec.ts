import {Bot} from '@mattermost/types/bots';
import {Channel} from '@mattermost/types/channels';
import {Team} from '@mattermost/types/teams';
import {UserProfile} from '@mattermost/types/users';
import {createBotPatch} from '../../../support/api/bots';
import {generateRandomUser} from '../../../support/api/user';
describe('Bot accounts', () => {
    let team: Team;
    let channel: Channel;
    let testUser: UserProfile;
    let bots: Bot[];
    let createdUsers: UserProfile[];
    before(() => {
        cy.shouldNotRunOnCloudEdition();
        cy.apiInitSetup().then((out) => {
            team = out.team;
            channel = out.channel;
            testUser = out.user;
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
    beforeEach(() => {
        cy.apiAdminLogin();
    });
    it('MM-T1836 Bot accounts display', () => {
        cy.apiLogin(testUser);
        cy.visit(`/${team.name}/messages/@${bots[0].username}`);
        cy.get('.SidebarChannelGroup:contains(DIRECT MESSAGES) .SidebarChannel.active > .SidebarLink').then(($link) => {
            cy.wrap($link).find('.SidebarChannelLinkLabel').should('have.text', bots[0].username);
            cy.wrap($link).find('.Avatar').should('exist').
                invoke('attr', 'src').
                then((url) => cy.request({url, encoding: 'binary'})).
                then(({body}) => {
                    cy.fixture('bot-default-avatar.png', 'binary').should('deep.equal', body);
                });
        });
        cy.postMessage('Bump bot chat recency');
        cy.visit(`/${team.name}/messages/@${createdUsers[0].username}`);
        cy.postMessage('Hello, regular user');
        cy.get('.SidebarChannelGroup:contains(DIRECT MESSAGES) .SidebarChannel.active').siblings('.SidebarChannel').then(($siblings) => {
            cy.wrap($siblings).contains('.SidebarChannelLinkLabel', bots[0].username);
        });
    });
});