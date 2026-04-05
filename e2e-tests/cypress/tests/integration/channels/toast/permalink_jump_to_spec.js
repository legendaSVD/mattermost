describe('Toast', () => {
    let testChannelDisplayName;
    let testChannelUrl;
    before(() => {
        cy.apiInitSetup({loginAfter: true}).then(({channel, channelUrl}) => {
            testChannelDisplayName = channel.display_name;
            testChannelUrl = channelUrl;
            cy.visit(testChannelUrl);
        });
    });
    it('MM-T1791 Permalink \'Jump to\' in Search', () => {
        const searchTerm = 'test';
        cy.postMessage(searchTerm);
        cy.uiGetSearchContainer().should('be.visible').click();
        cy.uiGetSearchBox().type(searchTerm).type('{enter}');
        cy.get('.search-item__jump').first().click();
        cy.getLastPostId().then((postId) => {
            cy.url().should('include', `${testChannelUrl}/${postId}`);
            cy.get('#channelHeaderInfo').should('be.visible').and('contain', testChannelDisplayName);
            cy.get(`#post_${postId}`).should('have.class', 'post--highlight');
            cy.get(`#post_${postId}`).should('not.have.class', 'post--highlight');
            cy.url().should('include', testChannelUrl).and('not.include', postId);
        });
    });
});