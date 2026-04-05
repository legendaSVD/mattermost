describe('Keyboard Shortcuts', () => {
    before(() => {
        cy.apiInitSetup({loginAfter: true}).then(({channelUrl}) => {
            cy.visit(channelUrl);
        });
    });
    it('MM-T1261 UP arrow', () => {
        cy.postMessage('Hello World');
        cy.getLastPostId().then((postId) => {
            cy.clickPostDotMenu(postId);
            cy.findByText('Reply').click();
            const replyMessage = 'Well, hello there.';
            cy.uiGetReplyTextBox().type(replyMessage, {delay: 100});
            cy.uiGetReplyTextBox().type('{enter}');
            cy.uiWaitUntilMessagePostedIncludes(replyMessage);
            cy.get('body').type('{uparrow}');
            cy.get('#edit_textbox').should('be.visible');
            cy.get('#edit_textbox').should('have.value', replyMessage);
        });
    });
});