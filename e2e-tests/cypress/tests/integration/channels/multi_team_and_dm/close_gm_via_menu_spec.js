describe('Multi-user group messages', () => {
    let testUser;
    let testTeam;
    before(() => {
        cy.apiInitSetup().then(({team, user}) => {
            testUser = user;
            testTeam = team;
            Cypress._.times(3, () => createUserAndAddToTeam(testTeam));
        });
    });
    it('MM-T1799 Should Close Group Message from channel menu', () => {
        cy.apiLogin(testUser);
        cy.visit(`/${testTeam.name}/channels/town-square`);
        cy.uiAddDirectMessage().should('be.visible').click();
        addUsersToGMViaModal(3);
        cy.get('.react-select__multi-value').should('have.length', 3);
        cy.get('#saveItems').click();
        cy.get('#channelHeaderTitle').click();
        cy.findByText('Close Group Message').should('be.visible').click();
        expectActiveChannelToBe('Town Square', '/town-square');
    });
});
const expectActiveChannelToBe = (title, url) => {
    cy.get('#channelHeaderTitle').
        should('be.visible').
        and('contain.text', title);
    cy.url().should('contain', url);
};
const createUserAndAddToTeam = (team) => {
    cy.apiCreateUser({prefix: 'gm'}).then(({user}) =>
        cy.apiAddUserToTeam(team.id, user.id),
    );
};
const addUsersToGMViaModal = (userCountToAdd) => {
    cy.get('#multiSelectList').
        should('be.visible').
        children().
        should('have.length.gte', userCountToAdd);
    Cypress._.times(userCountToAdd, () => {
        cy.get('#multiSelectList').
            children().
            first().
            click();
    });
};