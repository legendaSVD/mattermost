describe('Teams Suite', () => {
    before(() => {
        cy.apiInitSetup().then(({team, user}) => {
            const requiredMembersCount = 60;
            cy.apiGetUsersNotInTeam({teamId: team.id, page: 0, perPage: 200}).then(({users}) => {
                const usersToAdd = users.
                    filter((u) => u.delete_at === 0).
                    slice(0, requiredMembersCount - 3).
                    map((u) => ({team_id: team.id, user_id: u.id}));
                Cypress._.chunk(usersToAdd, 20).forEach((chunk) => {
                    cy.apiAddUsersToTeam(team.id, chunk);
                });
            });
            cy.apiGetTeamMembers(team.id).then(({members}) => {
                if (members.length < requiredMembersCount) {
                    Cypress._.times(requiredMembersCount - members.length, () => {
                        cy.apiCreateUser().then(({user: newUser}) => {
                            cy.apiAddUserToTeam(team.id, newUser.id);
                        });
                    });
                }
            });
            cy.apiUpdateTeamMemberSchemeRole(team.id, user.id, {scheme_admin: true, scheme_user: true});
            cy.apiLogin(user);
            cy.visit(`/${team.name}/channels/town-square`);
        });
    });
    it('MM-T384 Team Admin can use Next button to page through list in Manage Members', () => {
        cy.uiOpenTeamMenu('Manage members');
        cy.get('#teamMemberModalLabel').should('be.visible');
        cy.get('#searchableUserListTotal').should('contain', '1 - 50 members of 60 total');
        cy.get('#searchableUserListNextBtn').should('be.visible').click();
        cy.get('#searchableUserListTotal').should('contain', '51 - 60 members of 60 total');
        cy.get('#searchableUserListPrevBtn').should('be.visible').click();
        cy.get('#searchableUserListTotal').should('contain', '1 - 50 members of 60 total');
    });
});