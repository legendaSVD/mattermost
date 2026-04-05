import * as TIMEOUTS from '../../../../fixtures/timeouts';
describe('Channel members test', () => {
    let testChannel;
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
            testChannel = channel;
            cy.apiCreateUser().then(({user: newUser}) => {
                user2 = newUser;
                cy.apiAddUserToTeam(team.id, user2.id).then(() => {
                    cy.apiAddUserToChannel(testChannel.id, user2.id);
                });
            });
        });
    });
    it('MM-23938 - Channel members block is only visible when channel is not group synced', () => {
        cy.visit(`/admin_console/user_management/channels/${testChannel.id}`);
        cy.get('#channelMembers').scrollIntoView().should('be.visible');
        cy.findByTestId('syncGroupSwitch').
            scrollIntoView().
            findByRole('button').
            click({force: true});
        cy.get('#channelMembers').should('not.exist');
    });
    it('MM-23938 - Channel Members block can search for users, remove users, add users and modify their roles', () => {
        cy.visit(`/admin_console/user_management/channels/${testChannel.id}`);
        cy.get('#channelMembers').scrollIntoView().should('be.visible');
        searchFor(user1.email);
        cy.get('#channelMembers .DataGrid_loading').should('not.exist');
        cy.get('#channelMembers .UserGrid_removeRow a').should('be.visible').click();
        cy.get('#saveSetting').click();
        cy.get('#confirmModalBody').should('be.visible').and('contain', '1 user will be removed.').and('contain', 'Are you sure you wish to remove this user?');
        cy.get('#cancelModalButton').click();
        searchFor(user2.email);
        cy.get('#channelMembers .DataGrid_loading').should('not.exist');
        cy.get('#channelMembers .UserGrid_removeRow a').should('be.visible').click();
        cy.get('#saveSetting').click();
        cy.get('#confirmModalBody').should('be.visible').and('contain', '2 users will be removed.').and('contain', 'Are you sure you wish to remove these users?');
        cy.get('#confirmModalButton').click();
        cy.get('#channelMembers').should('not.exist');
        cy.visit(`/admin_console/user_management/channels/${testChannel.id}`);
        searchFor(user1.email);
        cy.get('#channelMembers .DataGrid_rows').should('contain', 'No users found');
        searchFor(user2.email);
        cy.get('#channelMembers .DataGrid_rows').should('contain', 'No users found');
        cy.get('#addChannelMembers').click();
        cy.findByRole('combobox', {name: 'Search for people or groups'}).typeWithForce(`${user1.email}{enter}${user2.email}{enter}`);
        cy.get('#addUsersToChannelModal #saveItems').click();
        searchFor(user1.email);
        cy.get('#channelMembers .DataGrid_rows').children(0).should('contain', user1.email).and('contain', 'New');
        cy.get(`#userGridRoleDropdown_${user1.username}`).click();
        cy.get('.Menu__content').should('be.visible').within(() => {
            cy.findByText('Make Channel Admin').should('be.visible');
            cy.findByText('Make Channel Admin').click();
        });
        searchFor(user2.email);
        cy.get('#channelMembers .DataGrid_rows').children(0).should('contain', user2.email).and('contain', 'New');
        searchFor(sysadmin.email);
        cy.get('#channelMembers .DataGrid_rows').children(0).should('contain', sysadmin.email);
        saveConfig();
        cy.visit(`/admin_console/user_management/channels/${testChannel.id}`);
        searchFor(user1.email);
        cy.get('#channelMembers .DataGrid_loading').should('not.exist');
        cy.get('#channelMembers .DataGrid_rows').children(0).should('contain', user1.email).and('not.contain', 'New').and('contain', 'Channel Admin');
        cy.get(`#userGridRoleDropdown_${user1.username}`).click();
        cy.get('.Menu__content').should('be.visible').within(() => {
            cy.findByText('Make Channel Member').should('be.visible').click();
        });
        cy.get('#channelMembers .DataGrid_rows').children(0).should('contain', user1.email).and('not.contain', 'New').and('contain', 'Member');
        searchFor(user2.email);
        cy.get('#channelMembers .DataGrid_loading').should('not.exist');
        cy.get('#channelMembers .DataGrid_rows').children(0).should('contain', user2.email).and('not.contain', 'New').and('contain', 'Member');
        saveConfig();
    });
});
function saveConfig() {
    cy.get('#saveSetting').click();
    cy.get('#channelMembers').should('not.exist');
}
function searchFor(searchTerm) {
    cy.get('#channelMembers .DataGrid_search input[type="text"]').scrollIntoView().clear().type(searchTerm);
    cy.wait(TIMEOUTS.HALF_SEC);
}