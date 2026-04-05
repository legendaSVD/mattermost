describe('Messaging', () => {
    before(() => {
        cy.apiInitSetup({loginAfter: true}).then(({offTopicUrl}) => {
            cy.visit(offTopicUrl);
        });
    });
    it('MM-T1539 Gendered emojis are rendered with the correct gender', () => {
        cy.postMessage('🙆‍♂️');
        cy.findByTitle(':man-gesturing-ok:').should('be.visible');
        cy.postMessage('🙆‍♀️');
        cy.findByTitle(':woman-gesturing-ok:').should('be.visible');
    });
});