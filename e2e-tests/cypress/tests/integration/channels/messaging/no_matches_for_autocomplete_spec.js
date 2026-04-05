describe('No Matches for Autocomplete', () => {
    before(() => {
        cy.apiInitSetup().then(({team}) => {
            cy.visit(`/${team.name}/channels/town-square`);
        });
    });
    it('MM-T270 No matches for user autocomplete', () => {
        const nonExistentUser = 'nonExistentUser';
        cy.uiGetPostTextBox().clear().type(`@${nonExistentUser}`);
        cy.get('#suggestionList').should('not.exist');
        cy.uiGetPostTextBox().type('{enter}');
        cy.getLastPost().within(() => {
            cy.get(`[data-mention=${nonExistentUser}]`).should('include.text', `@${nonExistentUser}`);
            cy.get('.mention-link').should('not.exist');
        });
    });
    it('MM-T269 No matches for channel autocomplete', () => {
        const nonExistentChannel = 'nonExistentChannel';
        cy.uiGetPostTextBox().clear().clear().type(`~${nonExistentChannel}`);
        cy.get('#suggestionList').should('not.exist');
        cy.uiGetPostTextBox().type('{enter}');
        cy.getLastPost().should('include.text', `~${nonExistentChannel}`).within(() => {
            cy.get(`[data-channel-mention=${nonExistentChannel}]`).should('not.exist');
            cy.get('.mention-link').should('not.exist');
        });
    });
});