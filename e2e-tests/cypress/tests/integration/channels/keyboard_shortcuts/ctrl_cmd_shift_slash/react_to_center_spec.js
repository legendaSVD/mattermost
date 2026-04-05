import * as TIMEOUTS from '../../../../fixtures/timeouts';
import * as MESSAGES from '../../../../fixtures/messages';
import {
    checkReactionFromPost,
    doReactToLastMessageShortcut,
} from './helpers';
describe('Keyboard shortcut CTRL/CMD+Shift+\\ for adding reaction to last message', () => {
    let testUser;
    let otherUser;
    let testTeam;
    let offTopicChannel;
    before(() => {
        cy.apiInitSetup().then(({team, user}) => {
            testUser = user;
            testTeam = team;
            cy.apiCreateUser({prefix: 'other'}).then(({user: user1}) => {
                otherUser = user1;
                cy.apiGetChannelByName(testTeam.name, 'off-topic').then((out) => {
                    offTopicChannel = out.channel;
                });
                cy.apiAddUserToTeam(testTeam.id, otherUser.id);
            });
        });
    });
    beforeEach(() => {
        cy.apiLogin(testUser);
        cy.visit(`/${testTeam.name}/channels/off-topic`);
        cy.get('#channelHeaderTitle', {timeout: TIMEOUTS.ONE_MIN}).should('be.visible').and('contain', 'Off-Topic');
        cy.postMessage('hello');
    });
    it('MM-T4060_1 Open emoji picker on center when focus is neither on center or comment textbox even if RHS is opened', () => {
        cy.clickPostCommentIcon();
        cy.get('#rhsContainer').should('be.visible');
        cy.postMessageReplyInRHS(MESSAGES.SMALL);
        cy.postMessageReplyInRHS(MESSAGES.TINY);
        cy.getLastPostId().as('prevLastPostId');
        cy.postMessageAs({
            sender: otherUser,
            message: MESSAGES.MEDIUM,
            channelId: offTopicChannel.id,
        });
        cy.wait(TIMEOUTS.TWO_SEC);
        cy.get('body').click();
        cy.wait(TIMEOUTS.TWO_SEC);
        doReactToLastMessageShortcut();
        cy.clickEmojiInEmojiPicker('smile');
        cy.getLastPostId().then((lastPostId) => {
            cy.get(`#post_${lastPostId}`).findByLabelText('You reacted with :smile:. Click to remove.').should('exist');
        });
        cy.get('@prevLastPostId').then((lastPostId) => {
            cy.get(`#rhsPost_${lastPostId}`).findByLabelText('You reacted with :smile:. Click to remove.').should('not.exist');
            cy.get(`#post_${lastPostId}`).findByLabelText('You reacted with :smile:. Click to remove.').should('not.exist');
        });
        cy.uiCloseRHS();
    });
    it('MM-T4060_2 Open emoji picker on center when focus is on center text box even if RHS is opened', () => {
        cy.clickPostCommentIcon();
        cy.get('#rhsContainer').should('be.visible');
        cy.postMessageReplyInRHS(MESSAGES.SMALL);
        cy.postMessageReplyInRHS(MESSAGES.TINY);
        cy.getLastPostId().then((lastPostId) => {
            cy.get(`#${lastPostId}_message`).as('postInRHS');
        });
        cy.postMessageAs({
            sender: otherUser,
            message: MESSAGES.MEDIUM,
            channelId: offTopicChannel.id,
        });
        cy.wait(TIMEOUTS.FIVE_SEC);
        cy.uiGetLhsSection('CHANNELS').findByText('Off-Topic').click();
        doReactToLastMessageShortcut('CENTER');
        cy.clickEmojiInEmojiPicker('smile');
        cy.getLastPostId().then((lastPostId) => {
            cy.get(`#${lastPostId}_message`).as('postInCenter');
        });
        cy.getLastPostId().then((lastPostId) => {
            checkReactionFromPost(lastPostId);
        });
        cy.get('@postInRHS').within(() => {
            cy.findByLabelText('reactions').should('not.exist');
            cy.findByLabelText('You reacted with :smile:. Click to remove.').should('not.exist');
        });
        cy.uiCloseRHS();
    });
    it('MM-T1804_1 Open emoji picker for last message when focus is on center textbox', () => {
        doReactToLastMessageShortcut('CENTER');
        cy.clickEmojiInEmojiPicker('smile');
        cy.getLastPostId().then((lastPostId) => {
            checkReactionFromPost(lastPostId);
        });
    });
    it('MM-T1804_2 Open emoji picker for last message even when focus is not on center textbox', () => {
        cy.uiGetLhsSection('CHANNELS').findByText('Off-Topic').click();
        doReactToLastMessageShortcut();
        cy.clickEmojiInEmojiPicker('smile');
        cy.getLastPostId().then((lastPostId) => {
            checkReactionFromPost(lastPostId);
        });
    });
    it('MM-T1804_3 Should reopen emoji picker even if shortcut is hit repeatedly on center', () => {
        Cypress._.times(3, () => {
            doReactToLastMessageShortcut('CENTER');
            cy.get('#emojiPicker').should('exist');
            cy.get('body').click();
            cy.get('#emojiPicker').should('not.exist');
        });
        doReactToLastMessageShortcut('CENTER');
        cy.clickEmojiInEmojiPicker('smile');
        cy.getLastPostId().then((lastPostId) => {
            checkReactionFromPost(lastPostId);
        });
    });
    it('MM-T1804_4 Should add reaction to same post on which emoji picker was opened', () => {
        cy.getLastPostId().then((lastPostId) => {
            cy.wrap(lastPostId).as('postIdForAddingReaction');
        });
        doReactToLastMessageShortcut();
        cy.get('#emojiPicker').should('exist');
        cy.postMessageAs({
            sender: otherUser,
            message: MESSAGES.TINY,
            channelId: offTopicChannel.id,
        });
        cy.wait(TIMEOUTS.FIVE_SEC);
        cy.clickEmojiInEmojiPicker('smile');
        cy.get('@postIdForAddingReaction').then((postIdForAddingReaction) => {
            checkReactionFromPost(postIdForAddingReaction);
        });
        cy.getLastPostId().then((lastPostId) => {
            cy.get(`#${lastPostId}_message`).within(() => {
                cy.findByLabelText('reactions').should('not.exist');
                cy.findByLabelText('You reacted with :smile:. Click to remove.').should('not.exist');
            });
        });
    });
});