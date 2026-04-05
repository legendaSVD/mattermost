describe('Messaging', () => {
    before(() => {
        cy.apiInitSetup({loginAfter: true}).then(({offTopicUrl}) => {
            cy.visit(offTopicUrl);
        });
    });
    it('MM-T167 Terms that are not valid emojis render as plain text', () => {
        cy.postMessage(':pickle:');
        cy.getLastPost().should('contain', ':pickle:');
        cy.postMessage('on Mon Jun 03 16:15:11 +0000 2019');
        cy.getLastPost().should('contain', 'on Mon Jun 03 16:15:11 +0000 2019');
    });
});