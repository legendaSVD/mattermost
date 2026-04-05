describe('View Members modal', () => {
    it('MM-20164 - Going from a Member to an Admin should update the modal', () => {
        cy.apiInitSetup().then(({team, user}) => {
            cy.apiCreateUser().then(({user: user1}) => {
                cy.apiAddUserToTeam(team.id, user1.id);
            });
            cy.apiLogin(user);
            cy.externalUpdateUserRoles(user.id, 'system_user system_admin');
            cy.visit(`/${team.name}/channels/town-square`);
            verifyMemberDropdownAction(true);
            cy.externalUpdateUserRoles(user.id, 'system_user');
            cy.reload();
            verifyMemberDropdownAction(false);
        });
    });
});
function verifyMemberDropdownAction(hasActionItem) {
    cy.get('#member_rhs').click();
    cy.uiGetRHS().should('be.visible').within(() => {
        cy.findByText('Manage').click();
    });
    if (hasActionItem) {
        cy.uiGetRHS().findAllByText('Member').should('exist');
    } else {
        cy.uiGetRHS().findByText('Member').should('not.exist');
    }
}