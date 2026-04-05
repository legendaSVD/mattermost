describe('Mention self', () => {
    let testUser;
    before(() => {
        cy.apiInitSetup({loginAfter: true}).then(({offTopicUrl, user}) => {
            testUser = user;
            cy.visit(offTopicUrl);
        });
    });
    it('should be always highlighted', () => {
        [
            `@${testUser.username} `,
            `@${testUser.username}. `,
            `@${testUser.username}_ `,
            `@${testUser.username}- `,
            `@${testUser.username}, `,
        ].forEach((message) => {
            cy.postMessage(message);
            cy.getLastPostId().then((postId) => {
                cy.get(`#postMessageText_${postId}`).find('.mention--highlight');
            });
        });
    });
    it('should be able to click on tryAI hashtag in a message with self-mention', () => {
        const message = `Hey @${testUser.username} check out #tryAI`;
        cy.postMessage(message);
        cy.findByRole('button', {name: /Recent mentions/i}).click();
        cy.getLastPostId().as('lastPostId');
        cy.get('@lastPostId').then((postId) => {
            verifySearchResult(postId, message);
        });
        cy.get('.sidebar--right__title').should('contain.text', 'Search Results');
        cy.get('@lastPostId').then((postId) => {
            verifySearchResult(postId, message);
        });
    });
});
function verifySearchResult(postId, fullMessage) {
    cy.get(`[data-testid="search-item-container"] #rhsPostMessageText_${postId}`).closest('[data-testid="search-item-container"]').within(() => {
        cy.get(`#rhsPostMessageText_${postId}`).should('have.text', `${fullMessage}`);
        cy.contains('a', '#tryAI').click({force: true});
    });
}