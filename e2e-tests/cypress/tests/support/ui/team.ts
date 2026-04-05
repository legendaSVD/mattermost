function uiInviteMemberToCurrentTeam(username: string) {
    cy.uiOpenTeamMenu('Invite people');
    cy.findByTestId('invitationModal').
        then((container) => container.find('[data-testid="inviteMembersLink"]')).
        then((link) => link?.click());
    cy.get('.users-emails-input__control input').typeWithForce(username).as('input');
    cy.get('.users-emails-input__option ').contains(`@${username}`);
    cy.get('@input').typeWithForce('{enter}');
    cy.findByTestId('inviteButton').click();
    cy.get('.invitation-modal-confirm--sent .InviteResultRow').
        should('contain.text', `@${username}`).
        and('contain.text', 'This member has been added to the team.');
    cy.findByTestId('confirm-done').click();
}
Cypress.Commands.add('uiInviteMemberToCurrentTeam', uiInviteMemberToCurrentTeam);
declare global {
    namespace Cypress {
        interface Chainable {
            uiInviteMemberToCurrentTeam: typeof uiInviteMemberToCurrentTeam;
        }
    }
}
export {};