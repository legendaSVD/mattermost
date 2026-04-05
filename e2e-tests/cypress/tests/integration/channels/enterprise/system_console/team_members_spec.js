import * as TIMEOUTS from '../../../../fixtures/timeouts';
describe('Team members test', () => {
    let testTeam;
    let user1;
    let user2;
    let sysadmin;
    before(() => {
        cy.apiAdminLogin().then((res) => {
            sysadmin = res.user;
        });
        cy.apiRequireLicense();
        cy.apiInitSetup().then(({team, channel, user}) => {
            user1 = user;
            testTeam = team;
            cy.apiCreateUser().then(({user: otherUser}) => {
                user2 = otherUser;
                cy.apiAddUserToTeam(testTeam.id, user2.id).then(() => {
                    cy.apiAddUserToChannel(channel.id, user2.id);
                });
            });
        });
    });
    it("MM-58840 Teams - can't navigate to invalid URL", () => {
        cy.visit('/admin_console/user_management/teams/invalid');
        cy.findByText('Mattermost Teams').should('be.visible');
    });
    it('MM-23938 - Team members block is only visible when team is not group synced', () => {
        cy.visit(`/admin_console/user_management/teams/${testTeam.id}`);
        cy.get('#teamMembers').scrollIntoView().should('be.visible');
        cy.findByTestId('syncGroupSwitch').
            scrollIntoView().
            findByRole('button').
            click({force: true});
        cy.get('#teamMembers').should('not.exist');
    });
    it('MM-23938 - Team members block can search for users, remove users, add users and modify their roles', () => {
        cy.visit(`/admin_console/user_management/teams/${testTeam.id}`);
        cy.get('#teamMembers').scrollIntoView().should('be.visible');
        searchFor(user1.email);
        cy.get('#teamMembers .DataGrid_loading').should('not.exist');
        cy.get('#teamMembers .UserGrid_removeRow a').should('be.visible').click();
        cy.get('#saveSetting').click();
        cy.get('#confirmModalBody').should('be.visible').and('contain', '1 user will be removed.').and('contain', 'Are you sure you wish to remove this user?');
        cy.get('#cancelModalButton').click();
        searchFor(user2.email);
        cy.get('#teamMembers .DataGrid_loading').should('not.exist');
        cy.get('#teamMembers .UserGrid_removeRow a').should('be.visible').click();
        cy.get('#saveSetting').click();
        cy.get('#confirmModalBody').should('be.visible').and('contain', '2 users will be removed.').and('contain', 'Are you sure you wish to remove these users?');
        cy.get('#confirmModalButton').click();
        cy.get('#teamMembers').should('not.exist');
        cy.visit(`/admin_console/user_management/teams/${testTeam.id}`);
        searchFor(user1.email);
        cy.get('#teamMembers .DataGrid_rows').should('contain', 'No users found');
        searchFor(user2.email);
        cy.get('#teamMembers .DataGrid_rows').should('contain', 'No users found');
        cy.get('#addTeamMembers').click();
        cy.get('#addUsersToTeamModal input').typeWithForce(`${user1.email}{enter}${user2.email}{enter}`);
        cy.get('#addUsersToTeamModal #saveItems').click();
        searchFor(user1.email);
        cy.get('#teamMembers .DataGrid_rows').children(0).should('contain', user1.email).and('contain', 'New');
        cy.get(`#userGridRoleDropdown_${user1.username}`).click();
        cy.get('.Menu__content').should('be.visible').within(() => {
            cy.findByText('Make Team Admin').should('be.visible').click();
        });
        searchFor(user2.email);
        cy.get('#teamMembers .DataGrid_rows').children(0).should('contain', user2.email).and('contain', 'New');
        searchFor(sysadmin.email);
        cy.get('#teamMembers .DataGrid_rows').children(0).should('contain', sysadmin.email);
        saveConfig();
        cy.visit(`/admin_console/user_management/teams/${testTeam.id}`);
        searchFor(user1.email);
        cy.get('#teamMembers .DataGrid_loading').should('not.exist');
        cy.get('#teamMembers .DataGrid_rows').children(0).should('contain', user1.email).and('not.contain', 'New').and('contain', 'Team Admin');
        cy.get(`#userGridRoleDropdown_${user1.username}`).click();
        cy.get('.Menu__content').should('be.visible').within(() => {
            cy.findByText('Make Team Member').should('be.visible').click();
        });
        cy.get('#teamMembers .DataGrid_rows').children(0).should('contain', user1.email).and('not.contain', 'New').and('contain', 'Member');
        searchFor(user2.email);
        cy.get('#teamMembers .DataGrid_loading').should('not.exist');
        cy.get('#teamMembers .DataGrid_rows').children(0).should('contain', user2.email).and('not.contain', 'New').and('contain', 'Member');
        saveConfig();
    });
});
function searchFor(searchTerm) {
    cy.get('#teamMembers .DataGrid_search input[type="text"]').scrollIntoView().clear().type(searchTerm);
    cy.wait(TIMEOUTS.HALF_SEC);
}
function saveConfig() {
    cy.get('#saveSetting').click();
    cy.get('#teamMembers').should('not.exist');
}