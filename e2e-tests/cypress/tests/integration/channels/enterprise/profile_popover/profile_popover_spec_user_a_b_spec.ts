describe('Profile popover User A & B', () => {
    let testTeam: Cypress.Team;
    let testUser: Cypress.UserProfile;
    let otherUser: Cypress.UserProfile;
    before(() => {
        cy.apiRequireLicense();
        cy.apiInitSetup().then(({team, user}) => {
            testTeam = team;
            testUser = user;
            cy.apiCreateUser().then(({user: secondUser}) => {
                otherUser = secondUser;
                cy.apiAddUserToTeam(testTeam.id, secondUser.id);
            });
            cy.removeUserFromTeam(testTeam.id, testUser.id);
        });
    });
    beforeEach(() => {
        cy.apiAdminLogin();
        cy.apiResetRoles();
    });
    it('MM-T5 User A & User B (removed from team)', () => {
        cy.apiLogin(otherUser);
        cy.visit(`/${testTeam.name}/channels/off-topic`);
        cy.postMessage(`Hi there @${testUser.username} `);
        cy.getLastPostId().then((postId) => {
            cy.get(`#postMessageText_${postId}`).
                find(`[data-mention=${testUser.username}]`).
                should('be.visible').
                click();
        });
        cy.findByText('Add to a Channel').should('not.exist');
    });
    it('MM-T8 Add User - UserA & UserB (not on team)', () => {
        cy.apiCreateTeam('team', 'Test NoMember').then(({team}) => {
            cy.apiAddUserToTeam(team.id, testUser.id);
            cy.apiLogin(testUser);
            cy.visit(`/${team.name}/channels/off-topic`);
            cy.postMessage(`Hi there @${otherUser.username} `);
            cy.getLastPostId().then((postId) => {
                cy.get(`#postMessageText_${postId}`).
                    find(`[data-mention=${otherUser.username}]`).
                    should('be.visible').
                    click();
                cy.get('div.user-profile-popover').should('be.visible');
            });
            cy.findByText('Add to a Channel').should('not.exist');
        });
    });
});