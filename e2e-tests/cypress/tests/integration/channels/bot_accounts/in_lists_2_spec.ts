import {Bot} from '@mattermost/types/bots';
import {Channel} from '@mattermost/types/channels';
import {Team} from '@mattermost/types/teams';
import {UserProfile} from '@mattermost/types/users';
import {createBotPatch} from '../../../support/api/bots';
import {generateRandomUser} from '../../../support/api/user';
describe('Bots in lists', () => {
    let team: Team;
    let channel: Channel;
    let testUser: UserProfile;
    const STATUS_PRIORITY = {
        online: 0,
        away: 1,
        dnd: 2,
        offline: 3,
        ooo: 3,
    };
    before(() => {
        cy.apiInitSetup().then((out) => {
            team = out.team;
            channel = out.channel;
            testUser = out.user;
        });
        cy.makeClient().then(async (client) => {
            const bots = await Promise.all([
                client.createBot(createBotPatch()),
                client.createBot(createBotPatch()),
                client.createBot(createBotPatch()),
            ]);
            const createdUsers = await Promise.all([
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
    it('MM-T1835 Channel Members list for BOTs', () => {
        cy.makeClient({user: testUser}).then((client) => {
            cy.apiLogin(testUser);
            cy.visit(`/${team.name}/channels/${channel.name}`);
            cy.get('.channel-header__trigger').click();
            cy.findByText('Manage members').click();
            cy.get('.more-modal__row .more-modal__name').then(async ($query) => {
                const usernames = $query.toArray().map(({innerText}) => innerText.split('\n')[0]);
                const profiles = await client.getProfilesByUsernames(usernames);
                const statuses = await client.getStatusesByIds(profiles.map((user) => user.id));
                const users = Cypress._.zip(profiles, statuses).map(([profile, status]) => ({...profile, ...status}));
                const sortedUsers = Cypress._.sortBy(users, [
                    ({is_bot: isBot}) => (isBot ? 1 : 0),
                    ({status}) => STATUS_PRIORITY[status],
                    ({username}) => username,
                ]);
                cy.wrap(usernames).should('deep.equal', sortedUsers.map(({username}) => username));
            });
            cy.get('.more-modal__row--bot .status-wrapper .status').should('not.exist');
            cy.get('.more-modal__row--bot .Tag').then(($tags) => {
                $tags.toArray().forEach((tagEl) => {
                    cy.wrap(tagEl).then(() => tagEl.scrollIntoView());
                    cy.wrap(tagEl).should('be.visible').and('have.text', 'BOT');
                });
            });
        });
    });
});