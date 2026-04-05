import {beRead, beUnread} from '../../../support/assertions';
import {markAsUnreadFromPost, switchToChannel} from './helpers';
describe('Leaving channel', () => {
    let testUser;
    let otherUser;
    let channelA;
    let channelB;
    let post1;
    beforeEach(() => {
        cy.visit('/');
        cy.apiAdminLogin();
        cy.apiInitSetup().then(({team, channel, user}) => {
            testUser = user;
            channelA = channel;
            cy.apiCreateChannel(team.id, 'channel-b', 'Channel B').then((out) => {
                channelB = out.channel;
                cy.apiAddUserToChannel(channelB.id, testUser.id);
            });
            cy.apiCreateUser().then(({user: user2}) => {
                otherUser = user2;
                cy.apiAddUserToTeam(team.id, otherUser.id).then(() => {
                    cy.apiAddUserToChannel(channelA.id, otherUser.id);
                    cy.postMessageAs({
                        sender: otherUser,
                        message: 'post1',
                        channelId: channelA.id,
                    }).then((p1) => {
                        post1 = p1;
                    });
                });
            });
            cy.apiLogin(testUser);
            cy.visit(`/${team.name}/channels/town-square`);
        });
    });
    it('MM-T2924_1 Channel is marked as read as soon as user leaves', () => {
        switchToChannel(channelA);
        cy.postMessageAs({sender: otherUser, message: 'post2', channelId: channelA.id});
        switchToChannel(channelB);
        cy.get(`#sidebarItem_${channelA.name}`).should(beRead);
    });
    it('MM-T2924_2 Channel is left unread if post is manually marked as unread and user leaves', () => {
        switchToChannel(channelA);
        markAsUnreadFromPost(post1);
        switchToChannel(channelB);
        cy.get(`#sidebarItem_${channelA.name}`).should(beUnread);
    });
});