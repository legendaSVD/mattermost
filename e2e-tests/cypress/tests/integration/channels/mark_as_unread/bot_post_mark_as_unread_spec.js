import {beUnread} from '../../../support/assertions';
import {markAsUnreadFromPost, verifyPostNextToNewMessageSeparator} from './helpers';
describe('Bot post unread message', () => {
    let newChannel;
    let botPost;
    let testTeam;
    before(() => {
        cy.apiInitSetup({
            promoteNewUserAsAdmin: true,
            loginAfter: true,
        }).then(({team, channel}) => {
            testTeam = team;
            newChannel = channel;
            cy.visit(`/${testTeam.name}/channels/${channel.name}`);
        });
        cy.apiCreateBot().then(({bot}) => {
            const botUserId = bot.user_id;
            cy.apiPatchUserRoles(botUserId, ['system_user system_post_all system_admin']);
            cy.apiAccessToken(botUserId, 'Create token').then(({token}) => {
                cy.apiAddUserToTeam(newChannel.team_id, botUserId);
                cy.postBotMessage({token, channelId: newChannel.id, message: 'this is bot message'}).then((res) => {
                    botPost = res.data;
                });
            });
        });
    });
    it('MM-T252 bot post unread', () => {
        markAsUnreadFromPost(botPost);
        cy.visit(`/${testTeam.name}/channels/town-square`);
        cy.get(`#sidebarItem_${newChannel.name}`).should(beUnread).click();
        verifyPostNextToNewMessageSeparator('this is bot message');
    });
});