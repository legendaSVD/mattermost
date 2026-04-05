describe('Keyboard Shortcuts', () => {
    let channelUrl;
    before(() => {
        cy.apiInitSetup({loginAfter: true}).then(({offTopicUrl}) => {
            channelUrl = offTopicUrl;
            cy.visit(channelUrl);
        });
    });
    it('MM-T1244 CTRL/CMD+K - Esc closes modal', () => {
        const searchTerm = 'test' + Date.now();
        cy.findByRole('button', {name: 'Find Channels'}).click();
        cy.get('#quickSwitchInput').typeWithForce(searchTerm);
        cy.get('.no-results__title').should('be.visible').and('have.text', 'No results for “' + searchTerm + '”');
        cy.get('#quickSwitchInput').typeWithForce('{esc}');
        cy.get('.modal-content').should('not.exist');
        cy.url().should('contain', channelUrl);
    });
});