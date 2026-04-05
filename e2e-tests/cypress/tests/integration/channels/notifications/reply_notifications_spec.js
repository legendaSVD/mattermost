import {spyNotificationAs} from '../../../support/notification';
describe('reply-notifications', () => {
    let testTeam;
    let testChannelUrl;
    let testChannelId;
    let testChannelName;
    let receiver;
    let sender;
    before(() => {
        cy.apiCreateUser().then(({user}) => {
            sender = user;
        });
        cy.apiInitSetup().then(({team, channel, user, channelUrl}) => {
            testTeam = team;
            receiver = user;
            testChannelUrl = channelUrl;
            testChannelId = channel.id;
            testChannelName = channel.name;
            cy.apiAddUserToTeam(testTeam.id, sender.id).then(() => {
                cy.apiAddUserToChannel(testChannelId, sender.id);
            });
            cy.apiLogin(receiver);
        });
    });
    it('MM-T551 Do not trigger notifications on messages in reply threads unless I\'m mentioned', () => {
        cy.visit(testChannelUrl);
        spyNotificationAs('notifySpy', 'granted');
        setReplyNotificationsSetting('#notificationCommentsNever');
        cy.postMessage('Hi there, this is a root message');
        cy.getLastPostId().then((postId) => {
            cy.uiClickSidebarItem('town-square');
            cy.uiGetSidebarItem(testChannelName).click({force: true});
            cy.postMessage('This is a reply to the root post');
            cy.get('@notifySpy').should('be.not.called');
            cy.uiGetSidebarItem(testChannelName).find('#unreadMentions').should('not.exist');
            cy.uiClickSidebarItem('town-square');
            cy.postMessageAs({sender, message: `Another reply with mention @${receiver.username}`, channelId: testChannelId, rootId: postId});
            cy.get('@notifySpy').should('be.called');
            cy.uiGetSidebarItem(testChannelName).find('#unreadMentions').should('be.visible');
        });
    });
    it('MM-T552 Trigger notifications on messages in threads that I start', () => {
        cy.visit(testChannelUrl);
        spyNotificationAs('notifySpy', 'granted');
        setReplyNotificationsSetting('#notificationCommentsRoot');
        cy.postMessage('Hi there, this is another root message');
        cy.getLastPostId().then((postId) => {
            cy.uiClickSidebarItem('town-square');
            const message = 'This is a reply to the root post';
            cy.postMessageAs({sender, message, channelId: testChannelId, rootId: postId}).then(() => {
                cy.get('@notifySpy').should('be.called');
                cy.uiGetSidebarItem(testChannelName).find('#unreadMentions').should('be.visible');
                cy.uiClickSidebarItem(testChannelName);
                cy.getLastPostId().then((msgId) => {
                    cy.get(`#postMessageText_${msgId}`).as('postMessageText');
                    cy.get(`#post_${msgId}`).should('have.class', 'mention-comment');
                });
                cy.get('@postMessageText').
                    should('be.visible').
                    and('have.text', message);
            });
        });
    });
    it('MM-T553 Trigger notifications on messages in reply threads that I start or participate in - start thread', () => {
        cy.visit(testChannelUrl);
        spyNotificationAs('notifySpy', 'granted');
        setReplyNotificationsSetting('#notificationCommentsAny');
        cy.postMessage('Hi there, this is another root message');
        cy.getLastPostId().then((postId) => {
            cy.uiClickSidebarItem('town-square');
            const message = 'This is a reply to the root post';
            cy.postMessageAs({sender, message, channelId: testChannelId, rootId: postId}).then(() => {
                cy.get('@notifySpy').should('be.called');
                cy.uiGetSidebarItem(testChannelName).find('#unreadMentions').should('be.visible');
                cy.uiClickSidebarItem(testChannelName);
                cy.getLastPostId().then((msgId) => {
                    cy.get(`#postMessageText_${msgId}`).as('postMessageText');
                    cy.get(`#post_${msgId}`).should('have.class', 'mention-comment');
                });
                cy.get('@postMessageText').
                    should('be.visible').
                    and('have.text', message);
            });
        });
    });
    it('MM-T554 Trigger notifications on messages in reply threads that I start or participate in - participate in', () => {
        cy.visit(testChannelUrl);
        spyNotificationAs('notifySpy', 'granted');
        setReplyNotificationsSetting('#notificationCommentsAny');
        const rootPostMessage = 'a root message by some other user';
        cy.postMessageAs({sender, message: rootPostMessage, channelId: testChannelId}).then((post) => {
            const rootPostId = post.id;
            const rootPostMessageId = `#rhsPostMessageText_${rootPostId}`;
            cy.clickPostCommentIcon(rootPostId);
            cy.get('#rhsContainer').should('be.visible');
            cy.get('#rhsContainer').find(rootPostMessageId).should('have.text', `${rootPostMessage}`);
            cy.postMessageReplyInRHS('this is a reply from the receiver');
            cy.getLastPostId().then(() => {
                cy.uiClickSidebarItem('town-square');
                const message = 'This is a reply by sender';
                cy.postMessageAs({sender, message, channelId: testChannelId, rootId: rootPostId}).then(() => {
                    cy.get('@notifySpy').should('be.called');
                    cy.uiGetSidebarItem(testChannelName).find('#unreadMentions').should('be.visible');
                    cy.uiClickSidebarItem(testChannelName);
                    cy.getLastPostId().then((msgId) => {
                        cy.get(`#postMessageText_${msgId}`).
                            should('be.visible').
                            and('have.text', message);
                        cy.get(`#rhsPost_${msgId}`).should('have.class', 'mention-comment');
                    });
                });
            });
        });
    });
});
function setReplyNotificationsSetting(idToToggle) {
    cy.uiOpenSettingsModal();
    cy.get('#notificationSettingsTitle').
        scrollIntoView().
        should('be.visible').
        and('contain', 'Notifications');
    cy.findByText('Reply notifications').should('be.visible').scrollIntoView().click();
    cy.get(idToToggle).check().should('be.checked');
    cy.uiSaveAndClose();
}