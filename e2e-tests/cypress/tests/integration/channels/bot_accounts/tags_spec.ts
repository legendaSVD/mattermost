import {Channel} from '@mattermost/types/channels';
import {Team} from '@mattermost/types/teams';
import {UserProfile} from '@mattermost/types/users';
import {createBotPatch} from '../../../support/api/bots';
import * as TIMEOUTS from '../../../fixtures/timeouts';
describe('Bot tags', () => {
    let me: UserProfile;
    let team: Team;
    let channel: Channel;
    let postId: string;
    before(() => {
        cy.apiInitSetup().then((out) => {
            team = out.team;
            channel = out.channel;
        });
        let meId;
        cy.getCurrentUserId().then((id) => {
            meId = id;
        });
        cy.makeClient().then(async (client) => {
            me = await client.getUser(meId);
            const bot = await client.createBot(createBotPatch());
            await client.addToTeam(team.id, bot.user_id);
            await client.addToChannel(bot.user_id, channel.id);
            const {token} = await client.createUserAccessToken(bot.user_id, 'Create token');
            const message = `Message for @${me.username}. Signed, @${bot.username}.`;
            const props = {attachments: [{pretext: 'Some Pretext', text: 'Some Text'}]};
            cy.postBotMessage({token, message, props, channelId: channel.id}).then(async ({id}) => {
                postId = id;
                await client.pinPost(postId);
                cy.visit(`/${team.name}/channels/${channel.name}`);
                cy.get(`#post_${postId}`).trigger('mouseover', {force: true});
                cy.wait(TIMEOUTS.HALF_SEC).get(`#CENTER_flagIcon_${postId}`).click();
            });
        });
    });
    it('MM-T1831 BOT tag is visible in search results', () => {
        cy.uiSearchPosts(`Message for @${me.username}`);
        cy.get('.sidebar--right__title').should('contain.text', 'Search Results');
        rhsPostHasBotBadge(postId);
    });
    it('MM-T1832 BOT tag is visible in Recent Mentions', () => {
        cy.uiGetRecentMentionButton().click();
        cy.get('.sidebar--right__title').should('contain.text', 'Recent Mentions');
        rhsPostHasBotBadge(postId);
    });
    it('MM-T1833 BOT tag is visible in Pinned Messages', () => {
        cy.uiGetChannelPinButton().click();
        cy.get('.sidebar--right__title').should('contain.text', 'Pinned messages');
        rhsPostHasBotBadge(postId);
    });
    it('MM-T3659 BOT tag is visible in Saved Messages', () => {
        cy.uiGetSavedPostButton().click();
        cy.get('.sidebar--right__title').should('contain.text', 'Saved messages');
        rhsPostHasBotBadge(postId);
    });
});
function rhsPostHasBotBadge(postId: string) {
    cy.get(`.post#searchResult_${postId} .Tag`).should('be.visible').and('have.text', 'BOT');
}