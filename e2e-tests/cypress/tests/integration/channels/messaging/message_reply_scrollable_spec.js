describe('Message reply scrollable', () => {
    before(() => {
        cy.apiInitSetup({loginAfter: true}).then(({team}) => {
            cy.visit(`/${team.name}/channels/off-topic`);
            cy.postMessage('Hello ' + Date.now());
        });
        cy.getLastPostId().then((postId) => {
            cy.clickPostCommentIcon(postId);
        });
        for (let i = 1; i <= 15; i++) {
            cy.postMessageReplyInRHS(`post ${i}`);
        }
    });
    it('MM-T4083_1 correctly scrolls to the bottom when a thread is opened', () => {
        cy.get('.post-right__content > div > div').first().scrollIntoView();
        cy.uiCloseRHS();
        cy.getLastPostId().then((postId) => {
            cy.clickPostCommentIcon(postId);
        });
        cy.uiGetRHS().findByLabelText('Send a message');
    });
    it('MM-T4083_2 correctly scrolls to the bottom when the user types in the comment box', () => {
        cy.get('.post-right__content > div > div').first().scrollIntoView();
        cy.uiGetReplyTextBox().type('foo', {scrollBehavior: false});
        cy.uiGetRHS().findByLabelText('Send a message');
    });
});