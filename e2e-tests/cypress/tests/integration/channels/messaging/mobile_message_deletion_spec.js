describe('Delete Parent Message', () => {
    before(() => {
        cy.viewport('iphone-6');
        cy.apiInitSetup({loginAfter: true}).then(({team}) => {
            cy.visit(`/${team.name}/channels/off-topic`);
        });
    });
    it('MM-T110 Delete a parent message that has a reply: Reply RHS', () => {
        cy.uiGetPostTextBox().click({force: true});
        cy.postMessage('Parent Message');
        cy.getLastPostId().then((postId) => {
            cy.clickPostCommentIcon(postId);
            cy.get('#rhsContainer').should('be.visible');
            const replyCount = 2;
            for (let i = 0; i < replyCount; i++) {
                cy.postMessageReplyInRHS('Reply');
            }
            cy.getLastPostId().then((replyPostId) => {
                cy.get('#deletePostModal').should('not.exist');
                cy.get('#sbrSidebarCollapse').click();
                cy.clickPostDotMenu(postId);
                cy.get(`#delete_post_${postId}`).click();
                cy.get('#deletePostModal').should('be.visible');
                cy.get('#deletePostModal').contains(replyCount).should('be.visible');
                cy.get('#deletePostModalButton').click({force: true});
                cy.get('#rhsContainer').should('not.exist');
                cy.get(`#post_${postId}`).should('not.exist');
                cy.get(`#post_${replyPostId}`).should('not.exist');
            });
        });
    });
});