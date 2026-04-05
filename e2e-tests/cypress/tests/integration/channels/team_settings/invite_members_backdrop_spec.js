describe('Invite Members', () => {
    before(() => {
        cy.apiUpdateConfig({
            ServiceSettings: {
                EnableAPITeamDeletion: true,
            },
            EmailSettings: {
                RequireEmailVerification: false,
            },
        });
    });
    describe('Invite members - backdrop click', () => {
        beforeEach(() => {
            cy.apiAdminLogin();
            cy.visit('/');
            cy.uiOpenTeamMenu('Invite people');
        });
        it('allows user to exit when there are no inputs', () => {
            testBackdropClickCloses(true);
        });
        it('does not close modal if user has inputs', () => {
            cy.get('.users-emails-input__control input').typeWithForce('some.user@mattermost.com');
            testBackdropClickCloses(false);
        });
    });
});
function testBackdropClickCloses(shouldClose) {
    cy.get('.modal-backdrop').click({force: true});
    if (shouldClose) {
        cy.get('.InvitationModal').should('not.exist');
    } else {
        cy.get('.InvitationModal').should('be.visible');
    }
}