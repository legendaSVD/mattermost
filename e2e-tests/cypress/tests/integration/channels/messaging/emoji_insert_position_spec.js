describe('Messaging', () => {
    before(() => {
        cy.apiInitSetup({loginAfter: true}).then(({offTopicUrl}) => {
            cy.visit(offTopicUrl);
        });
    });
    it('MM-T95 Selecting an emoji from emoji picker should insert it at the cursor position', () => {
        cy.uiGetPostTextBox().type('HelloWorld!');
        cy.uiGetPostTextBox().type('{leftarrow}{leftarrow}{leftarrow}{leftarrow}{leftarrow}{leftarrow}');
        cy.uiOpenEmojiPicker();
        cy.clickEmojiInEmojiPicker('grinning');
        cy.uiGetPostTextBox().should('have.value', 'Hello\uD83D\uDE00World!');
        cy.uiGetPostTextBox().type('{enter}');
        cy.getLastPost().find('p').should('contain', 'Hello').and('contain', 'World!');
    });
});