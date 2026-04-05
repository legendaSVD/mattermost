import {getRandomId} from '../../../utils';
describe('Search', () => {
    before(() => {
        cy.apiInitSetup({loginAfter: true}).then(({offTopicUrl}) => {
            cy.visit(offTopicUrl);
            Cypress._.times(5, () => {
                cy.postMessage(`asparagus${getRandomId()}`);
            });
        });
    });
    it('MM-T373 Search results Right-Hand-Side: Post a comment', () => {
        const message = `asparagus${getRandomId()}`;
        const comment = 'Replying to asparagus';
        cy.postMessage(message);
        cy.uiSearchPosts(message);
        cy.getLastPostId().then((postId) => {
            const postMessageText = `#rhsPostMessageText_${postId}`;
            cy.get('#search-items-container').find(postMessageText).should('have.text', `${message}`);
            cy.clickPostCommentIcon(postId, 'SEARCH');
            cy.postMessageReplyInRHS(comment);
            cy.uiGetRHS().
                find(postMessageText).
                should('have.text', `${message}`);
        });
        cy.getLastPostId().then((commentId) => {
            const rhsCommentText = `#rhsPostMessageText_${commentId}`;
            const mainCommentText = `#postMessageText_${commentId}`;
            cy.uiGetRHS().find(rhsCommentText).should('have.text', `${comment}`);
            cy.get('#postListContent').find(mainCommentText).should('have.text', `${comment}`);
        });
    });
});