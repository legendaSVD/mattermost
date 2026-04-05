import {beUnread} from '../../../support/assertions';
import {verifyPostNextToNewMessageSeparator, switchToChannel} from './helpers';
describe('Mark post with mentions as unread', () => {
    let userA;
    let userB;
    let channelA;
    let channelB;
    let testTeam;
    before(() => {
        cy.apiInitSetup().then(({team, user, channel}) => {
            userA = user;
            channelA = channel;
            testTeam = team;
            cy.apiCreateChannel(team.id, 'channel-b', 'Channel B').then((out) => {
                channelB = out.channel;
                cy.apiAddUserToChannel(channelB.id, userA.id);
            });
            cy.apiCreateUser().then(({user: user2}) => {
                userB = user2;
                cy.apiAddUserToTeam(testTeam.id, userB.id).then(() => {
                    cy.apiAddUserToChannel(channelA.id, userB.id);
                    cy.apiAddUserToChannel(channelB.id, userB.id);
                });
                cy.visit(`/${testTeam.name}/channels/town-square`);
            });
        });
    });
    it('MM-T247 Marks posts with mentions as unread', () => {
        cy.apiLogin(userB);
        cy.visit(`/${testTeam.name}/channels/town-square`);
        switchToChannel(channelA);
        switchToChannel(channelB);
        cy.postMessageAs({
            sender: userA,
            message: `@${userB.username} : hello1`,
            channelId: channelA.id,
        });
        cy.get(`#sidebarItem_${channelA.name}`).should(beUnread);
        cy.get(`#sidebarItem_${channelA.name}`).children('#unreadMentions').should('have.text', '1');
        switchToChannel(channelA);
        cy.get(`#sidebarItem_${channelA.name}`).children('#unreadMentions').should('not.exist');
        verifyPostNextToNewMessageSeparator(`@${userB.username} : hello1`);
        switchToChannel(channelB);
        switchToChannel(channelA);
        cy.get('.NotificationSeparator').should('not.exist');
        cy.postMessageAs({
            sender: userA,
            message: `@${userB.username} : hello2`,
            channelId: channelB.id,
        });
        switchToChannel(channelB);
        verifyPostNextToNewMessageSeparator(`@${userB.username} : hello2`);
        cy.reload();
        cy.get('.NotificationSeparator').should('not.exist');
        cy.postMessageAs({
            sender: userA,
            message: `@${userB.username} : hello3`,
            channelId: channelA.id,
        });
        switchToChannel(channelA);
        verifyPostNextToNewMessageSeparator(`@${userB.username} : hello3`);
        cy.getLastPostId().then((postId) => {
            cy.uiClickPostDropdownMenu(postId, 'Mark as Unread');
        });
        verifyPostNextToNewMessageSeparator(`@${userB.username} : hello3`);
        cy.get(`#sidebarItem_${channelA.name}`).should(beUnread);
        cy.get(`#sidebarItem_${channelA.name}`).children('#unreadMentions').should('have.text', '1');
        switchToChannel(channelB);
        switchToChannel(channelA);
        verifyPostNextToNewMessageSeparator(`@${userB.username} : hello3`);
        cy.get(`#sidebarItem_${channelA.name}`).children('#unreadMentions').should('not.exist');
        cy.postMessageAs({
            sender: userA,
            message: `@${userB.username} : hello4`,
            channelId: channelB.id,
        });
        switchToChannel(channelB);
        cy.getLastPostId().then((postId) => {
            cy.uiClickPostDropdownMenu(postId, 'Mark as Unread');
        });
        verifyPostNextToNewMessageSeparator(`@${userB.username} : hello4`);
        cy.get(`#sidebarItem_${channelB.name}`).children('#unreadMentions').should('have.text', '1');
        cy.reload();
        verifyPostNextToNewMessageSeparator(`@${userB.username} : hello4`);
        switchToChannel(channelA);
        cy.get(`#sidebarItem_${channelB.name}`).children('#unreadMentions').should('not.exist');
    });
});