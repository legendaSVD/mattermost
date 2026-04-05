import {Team} from '@mattermost/types/teams';
import {Channel} from '@mattermost/types/channels';
import {createBotPatch} from '../../../support/api/bots';
import {createChannelPatch} from '../../../support/api/channel';
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
    it('MM-T1815 Add a BOT to a team that has email restricted', () => {
        cy.makeClient().then(async (client) => {
            const channel = await client.getChannelByName(team.id, 'town-square');
            cy.visit(`/${team.name}/channels/${channel.name}`);
            const bot = await client.createBot(createBotPatch());
            cy.uiInviteMemberToCurrentTeam(bot.username);
            cy.uiWaitUntilMessagePostedIncludes(`@${bot.username} added to the team by you.`);
        });
    });
    it('MM-T1816 Add a BOT to a channel', () => {
        cy.makeClient().then(async (client) => {
            const channel = await client.createChannel(createChannelPatch(team.id, 'a-chan', 'A Channel') as Channel);
            cy.visit(`/${team.name}/channels/${channel.name}`);
            const bot = await client.createBot(createBotPatch());
            await client.addToTeam(team.id, bot.user_id);
            cy.uiInviteUsersToCurrentChannel([bot.username]);
            cy.uiWaitUntilMessagePostedIncludes(`@${bot.username} added to the channel by you.`);
        });
    });
    it('MM-T1817 Add a BOT to a channel that is not on the Team', () => {
        cy.makeClient().then(async (client) => {
            const channel = await client.createChannel(createChannelPatch(team.id, 'a-chan', 'A Channel') as Channel);
            cy.visit(`/${team.name}/channels/${channel.name}`);
            const bot = await client.createBot(createBotPatch());
            cy.postMessage(`/invite @${bot.username} `);
            cy.uiWaitUntilMessagePostedIncludes(`You can add @${bot.username} to this channel once they are members of`);
        });
    });
    it('MM-T1818 No ephemeral post about Adding a bot to a channel When Bot is mentioned', () => {
        cy.makeClient().then(async (client) => {
            const channel = await client.createChannel(createChannelPatch(team.id, 'a-chan', 'A Channel') as Channel);
            cy.visit(`/${team.name}/channels/${channel.name}`);
            const bot = await client.createBot(createBotPatch());
            cy.apiAddUserToTeam(team.id, bot.user_id);
            const message = `hey @${bot.username}, tell me a rhyme..`;
            cy.postMessage(message);
            cy.uiGetNthPost(-1).should('contain.text', message);
        });
    });
});