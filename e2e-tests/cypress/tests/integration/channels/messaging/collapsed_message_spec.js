describe('Long message', () => {
    before(() => {
        cy.apiInitSetup({loginAfter: true}).then(({offTopicUrl}) => {
            cy.visit(offTopicUrl);
        });
    });
    it('MM-T104 Can `Show More` and `Show Less` on long posts, Markdown in long posts', () => {
        cy.postMessageFromFile('long_text_post.txt');
        cy.getLastPostId().then((postId) => {
            const postMessageId = `#${postId}_message`;
            cy.get(postMessageId).within(() => {
                verifyCollapsedPost(postId);
                cy.get('#showMoreButton').click();
                verifyExpandedPost(postId);
                cy.get('#showMoreButton').click();
                verifyCollapsedPost(postId);
            });
        });
    });
});
function verifyCollapsedPost() {
    cy.get('#showMoreButton').scrollIntoView().should('be.visible').and('have.text', 'Show more');
}
function verifyExpandedPost() {
    cy.get('#showMoreButton').scrollIntoView().should('be.visible').and('have.text', 'Show less');
}