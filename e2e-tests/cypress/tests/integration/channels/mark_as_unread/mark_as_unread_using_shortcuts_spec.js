import {beRead, beUnread} from '../../../support/assertions';
import {verifyPostNextToNewMessageSeparator, switchToChannel, showCursor} from './helpers';
describe('Mark as Unread', () => {
    let testUser;
    let channelA;
    let channelB;
    let post1;
    let post2;
    before(() => {
        cy.apiInitSetup().then(({team, channel, user}) => {
            testUser = user;
            channelA = channel;
            cy.apiCreateChannel(team.id, 'channel-b', 'Channel B').then((out) => {
                channelB = out.channel;
                cy.apiAddUserToChannel(channelB.id, testUser.id);
            });
            cy.apiCreateUser().then(({user: user2}) => {
                const otherUser = user2;
                cy.apiAddUserToTeam(team.id, otherUser.id).then(() => {
                    cy.apiAddUserToChannel(channelA.id, otherUser.id);
                    cy.postMessageAs({sender: otherUser, message: 'post1', channelId: channelA.id}).then((p1) => {
                        post1 = p1;
                        cy.postMessageAs({sender: otherUser, message: 'post2', channelId: channelA.id}).then((p2) => {
                            post2 = p2;
                        });
                    });
                });
            });
            cy.apiLogin(testUser);
            cy.visit(`/${team.name}/channels/${channelA.name}`);
        });
    });
    it('MM-T251 using shortcuts to make post unread', () => {
        cy.get(`#post_${post2.id}`).trigger('mouseover').type('{alt}', {release: false}).should(showCursor);
        cy.get(`#post_${post2.id}`).click();
        verifyPostNextToNewMessageSeparator('post2');
        cy.get(`#sidebarItem_${channelA.name}`).should(beUnread);
        switchToChannel(channelB);
        switchToChannel(channelA);
        cy.get(`#sidebarItem_${channelB.name}`).should(beRead);
        cy.clickPostCommentIcon(post1.id);
        cy.uiClickPostDropdownMenu(post1.id, 'Mark as Unread', 'RHS_ROOT');
        verifyPostNextToNewMessageSeparator('post1');
        cy.get(`#sidebarItem_${channelA.name}`).should(beUnread);
    });
});