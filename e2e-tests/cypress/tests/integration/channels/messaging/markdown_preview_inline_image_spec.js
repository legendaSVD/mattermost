describe('Messaging', () => {
    before(() => {
        cy.apiInitSetup({loginAfter: true}).then(({offTopicUrl}) => {
            cy.visit(offTopicUrl);
            cy.postMessage('hello');
        });
    });
    it('MM-T186 Markdown preview: inline image', () => {
        const message = '![make it so](https://i.stack.imgur.com/MNeE7.jpg)';
        cy.uiGetPostTextBox().clear().then(() => {
            cy.get('#post-create').then((postArea) => {
                cy.wrap(parseInt(postArea[0].clientHeight, 10)).as('initialHeight');
            });
        });
        cy.uiGetPostTextBox().type(message).type('{shift}{enter}').type(message);
        cy.findByLabelText('preview').click();
        cy.get('#post-list').then((postList) => {
            cy.get('#create_post').within(() => {
                cy.get('.markdown-inline-img').then((img) => {
                    expect(postList[0].getBoundingClientRect().bottom).lessThan(img[0].getBoundingClientRect().top);
                    expect(postList[0].getBoundingClientRect().bottom).lessThan(img[1].getBoundingClientRect().top);
                    expect(img[0].getBoundingClientRect().bottom <= img[1].getBoundingClientRect().top).equals(true);
                });
            });
        });
        cy.get('#post-create').then((postArea) => {
            cy.get('@initialHeight').should('be.lessThan', parseInt(postArea[0].clientHeight, 10));
        });
    });
});