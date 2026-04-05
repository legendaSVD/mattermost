describe('Messaging', () => {
    before(() => {
        cy.apiInitSetup({loginAfter: true}).then(({offTopicUrl}) => {
            cy.visit(offTopicUrl);
            cy.postMessage('hello');
        });
    });
    it('MM-T189 Markdown quotation paragraphs', () => {
        const messageParts = ['this is', 'really', 'three quote lines'];
        cy.uiGetPostTextBox().clear().type('>' + messageParts[0]).type('{shift}{enter}{enter}');
        cy.uiGetPostTextBox().type('>' + messageParts[1]).type('{shift}{enter}{enter}');
        cy.uiGetPostTextBox().type('>' + messageParts[2]).type('{enter}');
        let firstPartLeft;
        cy.getLastPostId().then((postId) => {
            cy.get(`#postMessageText_${postId} > blockquote`).should('have.length', 1);
            cy.get(`#postMessageText_${postId} > blockquote > p`).should('have.length', 3);
            cy.get(`#postMessageText_${postId} > blockquote > p`).each((el, i) => {
                expect(messageParts[i]).equals(el.html());
                if (i === 0) {
                    firstPartLeft = el[0].getBoundingClientRect().left;
                }
                expect(firstPartLeft).equals(el[0].getBoundingClientRect().left);
            });
        });
    });
});