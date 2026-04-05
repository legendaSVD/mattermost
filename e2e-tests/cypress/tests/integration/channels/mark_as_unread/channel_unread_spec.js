import {beRead, beUnread} from '../../../support/assertions';
import {verifyPostNextToNewMessageSeparator, switchToChannel} from './helpers';
describe('channel unread posts', () => {
    let testUser;
    let otherUser;
    let channelA;
    let channelB;
    beforeEach(() => {
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
                    cy.apiAddUserToChannel(channelB.id, otherUser.id);
                });
                for (let index = 0; index < 5; index++) {
                    const message = `hello from current user: ${index}`;
                    cy.postMessageAs({sender: testUser, message, channelId: channelA.id});
                }
            });
            cy.apiLogin(testUser);
            cy.visit(`/${team.name}/channels/town-square`);
        });
    });
    it('MM-T246 Mark Post as Unread', () => {
        cy.apiLogin(otherUser);
        switchToChannel(channelA);
        cy.getLastPostId().then((postId) => {
            cy.uiClickPostDropdownMenu(postId, 'Mark as Unread');
        });
        verifyPostNextToNewMessageSeparator('hello from current user: 4');
        switchToChannel(channelB);
        cy.get(`#sidebarItem_${channelA.name}`).should(beUnread);
        switchToChannel(channelA);
        cy.get(`#sidebarItem_${channelA.name}`).should(beRead);
        verifyPostNextToNewMessageSeparator('hello from current user: 4');
        switchToChannel(channelB);
        cy.get(`#sidebarItem_${channelA.name}`).should(beRead);
    });
    it('MM-T256 Mark unread before a page of message in Channel', () => {
        cy.apiLogin(otherUser);
        switchToChannel(channelA);
        for (let index = 5; index < 40; index++) {
            const message = `hello from current user: ${index}`;
            cy.postMessageAs({sender: testUser, message, channelId: channelA.id});
        }
        cy.getNthPostId(6).then((postId) => {
            cy.get(`#post_${postId}`).scrollIntoView().should('be.visible');
            cy.uiClickPostDropdownMenu(postId, 'Mark as Unread');
        });
        verifyPostNextToNewMessageSeparator('hello from current user: 5');
        switchToChannel(channelB);
        switchToChannel(channelA);
        verifyPostNextToNewMessageSeparator('hello from current user: 5');
    });
    it('MM-T259 Mark as Unread channel remains unread when receiving new message', () => {
        cy.apiLogin(otherUser);
        switchToChannel(channelA);
        cy.getLastPostId().then((postId) => {
            cy.uiClickPostDropdownMenu(postId, 'Mark as Unread');
        });
        verifyPostNextToNewMessageSeparator('hello from current user: 4');
        cy.get(`#sidebarItem_${channelA.name}`).should(beUnread);
        for (let index = 5; index < 10; index++) {
            const message = `hello from current user: ${index}`;
            cy.postMessageAs({sender: testUser, message, channelId: channelA.id});
            cy.get(`#sidebarItem_${channelA.name}`).should(beUnread);
        }
        switchToChannel(channelB);
        cy.get(`#sidebarItem_${channelA.name}`).should(beUnread);
        switchToChannel(channelA);
        cy.get(`#sidebarItem_${channelA.name}`).should(beRead);
    });
});