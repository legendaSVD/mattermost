describe('Multi-user group messages', () => {
    let testUser;
    let testTeam;
    before(() => {
        cy.apiInitSetup().then(({team, user}) => {
            testUser = user;
            testTeam = team;
            Cypress._.times(10, () => createUserAndAddToTeam(testTeam));
        });
    });
    it('MM-T463 Should not be able to create a group message with more than 8 users', () => {
        cy.apiLogin(testUser);
        cy.visit(`/${testTeam.name}/channels/town-square`);
        cy.uiAddDirectMessage().click();
        addUsersToGMViaModal(7);
        cy.get('.react-select__multi-value').should('have.length', 7);
        expectCannotAddUsersMessage(0);
        addUsersToGMViaModal(1);
        cy.get('.react-select__multi-value').should('have.length', 7);
        cy.get('#saveItems').click();
        cy.get('#channelMemberCountText').
            should('be.visible').
            and('have.text', '8');
        cy.get('[data-testid="post_textbox_placeholder"]').
            should('be.visible').
            and('have.css', 'overflow', 'hidden').
            and('have.css', 'text-overflow', 'ellipsis');
        cy.get('#channelHeaderTitle').click();
        cy.get('#channelMembers').click();
        cy.uiGetButton('Add').click();
        addUsersToGMViaModal(1);
        expectCannotAddUsersMessage(0);
        cy.get('.react-select__multi-value').
            should('be.visible').
            and('have.length', 7);
        cy.get('.react-select__multi-value__remove').
            should('be.visible').
            and('have.length', 7).
            last().
            click();
        expectCannotAddUsersMessage(1);
    });
});
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
const expectCannotAddUsersMessage = (expectedUsersLeftToAdd) => {
    const maxUsersGMNote = "You've reached the maximum number of people for this conversation. Consider creating a private channel instead.";
    cy.get('#multiSelectHelpMemberInfo').
        should('be.visible').
        and('contain.text', `You can add ${expectedUsersLeftToAdd} more ${expectedUsersLeftToAdd === 1 ? 'person' : 'people'}`);
    if (expectedUsersLeftToAdd === 0) {
        cy.get('#multiSelectMessageNote').should('contain.text', maxUsersGMNote);
    }
};