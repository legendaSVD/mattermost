import {getAdminAccount} from 'tests/support/env';
describe('Message deletion', () => {
    before(() => {
        cy.apiUpdateConfig({
            ServiceSettings: {
                EnableAPIPostDeletion: true,
            },
        });
        cy.apiInitSetup({loginAfter: true}).then(({offTopicUrl}) => {
            cy.visit(offTopicUrl);
        });
    });
    it('MM-T112 Delete a parent message that has a reply - reply thread', () => {
        cy.postMessage('test message deletion');
        cy.getLastPostId().then((parentMessageId) => {
            cy.clickPostCommentIcon();
            cy.uiGetRHS();
            cy.postMessageReplyInRHS('test message reply in RHS');
            cy.getLastPostId().then((replyMessageId) => {
                cy.clickPostDotMenu(parentMessageId);
                cy.get(`#delete_post_${parentMessageId}`).click();
                cy.get('#deletePostModal').should('be.visible');
                cy.get('#deletePostModal').should('contain', 'Are you sure you want to delete this message?');
                cy.get('#deletePostModal').should('contain', 'This message has 1 comment on it.');
                cy.get('#deletePostModalButton').click();
                cy.get('#deletePostModal').should('not.exist');
                cy.uiGetRHS({exist: false});
                cy.get(`#post_${parentMessageId}`).should('not.exist');
                cy.get(`#post_${replyMessageId}`).should('not.exist');
            });
            cy.getLastPostId().then((replyMessageId) => {
                cy.get(`#post_${replyMessageId}`).should('not.contain', '(message deleted)');
            });
        });
    });
    it('Permanently delete a post and ensure it\'s reflected in the UI', () => {
        cy.postMessage('test message deletion');
        cy.getLastPostId().then((parentMessageId) => {
            const admin = getAdminAccount();
            cy.apiDeletePost(parentMessageId, admin, true);
            cy.get(`#post_${parentMessageId}`).should('contain', '(message deleted)');
        });
    });
});