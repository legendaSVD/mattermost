describe('Messaging', () => {
    before(() => {
        cy.viewport('iphone-6');
        cy.apiInitSetup({loginAfter: true}).then(({team}) => {
            cy.visit(`/${team.name}/channels/off-topic`);
            cy.postMessage('Hello ' + Date.now());
            cy.getLastPostId().then((postId) => {
                cy.clickPostCommentIcon(postId);
            });
            const replyValid = 'Hi ' + Date.now();
            cy.postMessageReplyInRHS(replyValid);
        });
    });
    it('MM-T74 Mobile view: Post options menu (3-dots) is present on a reply post in RHS', () => {
        cy.getLastPostId().then((lastPostId) => {
            const dotMenuButtonID = `#RHS_COMMENT_button_${lastPostId}`;
            cy.get(dotMenuButtonID).should('be.visible').click();
            const dropDownMenuOfPostOptionsID = `#RHS_COMMENT_dropdown_${lastPostId}`;
            cy.get(dropDownMenuOfPostOptionsID).should('be.visible').within(() => {
                cy.get('li').should('have.length.greaterThan', 0);
                cy.findByText('Add Reaction').should('be.visible');
                cy.findByText('Mark as Unread').should('be.visible');
                cy.findByText('Copy Link').should('be.visible');
                cy.findByText('Save Message').should('be.visible');
                cy.findByText('Pin to Channel').should('be.visible');
                cy.findByText('Edit').should('be.visible');
                cy.findByText('Delete').should('be.visible');
            });
        });
    });
});