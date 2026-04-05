describe('Message Reply too long', () => {
    before(() => {
        cy.apiInitSetup({loginAfter: true}).then(({team}) => {
            cy.visit(`/${team.name}/channels/off-topic`);
            cy.postMessage('Hello ' + Date.now());
        });
    });
    it('MM-T106 Webapp: "Message too long" warning text', () => {
        cy.getLastPostId().then((postId) => {
            cy.clickPostCommentIcon(postId);
        });
        const replyValid = 'Lorem ipsum dolor sit amet, consectetur adipiscing elit. ';
        cy.postMessageReplyInRHS(replyValid);
        cy.get('.post-error').should('not.exist');
        const maxReplyLength = 16383;
        const replyTooLong = replyValid.repeat((maxReplyLength / replyValid.length) + 1);
        cy.uiGetReplyTextBox().invoke('val', replyTooLong).trigger('input');
        cy.get('.post-error').should('be.visible');
        cy.uiGetReplyTextBox();
        cy.uiGetReplyTextBox().type('{enter}');
        cy.get('.post-error').should('be.visible').and('have.text', `Your message is too long. Character count: ${replyTooLong.length}/${maxReplyLength}`);
        cy.uiGetReplyTextBox();
        cy.getLastPostId().then((replyId) => {
            cy.get(`#postMessageText_${replyId}`).should('be.visible').and('have.text', replyValid);
        });
    });
});