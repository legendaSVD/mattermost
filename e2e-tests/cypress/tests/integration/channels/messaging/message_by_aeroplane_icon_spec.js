describe('Messaging', () => {
    before(() => {
        cy.viewport('iphone-6');
        cy.apiInitSetup({loginAfter: true}).then(({offTopicUrl}) => {
            cy.visit(offTopicUrl);
        });
    });
    it('MM-T73 Mobile view: Clicking on airplane icon does not open file attachment modal but sends the message', () => {
        const message = 'Lorem ipsum dolor sit amet, consectetur adipiscing elit. ';
        cy.uiGetPostTextBox().clear().type(message);
        cy.findByTestId('SendMessageButton').click();
        cy.getLastPostId().then((postId) => {
            cy.get(`#postMessageText_${postId}`).should('be.visible').and('have.text', message);
        });
        cy.get('.a11y__popup').should('not.exist');
    });
});