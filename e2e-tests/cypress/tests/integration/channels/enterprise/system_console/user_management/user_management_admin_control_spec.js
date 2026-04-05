import * as TIMEOUTS from '../../../../../fixtures/timeouts';
describe('User Management', () => {
    let testTeam;
    let testChannel;
    let testUser;
    let testUsersForRoles;
    const roleNames = ['system_manager', 'system_user_manager', 'system_read_only_admin'];
    before(() => {
        cy.apiRequireLicense();
        cy.apiInitSetup().then(({team, channel, user}) => {
            testChannel = channel;
            testTeam = team;
            testUser = user;
        });
        testUsersForRoles = {};
        Cypress._.forEach(roleNames, (roleName) => {
            cy.apiCreateUser().then(({user}) => {
                testUsersForRoles[roleName] = user;
                cy.apiAddUserToTeam(testTeam.id, user.id);
            });
        });
    });
    it('MM-T5596 Verify Admin can change user\'s settings from the user management in admin console', () => {
        cy.apiAdminLogin();
        cy.visit('/admin_console/user_management/users');
        gotoUserConfigurationPage(testUser);
        verifyManageUserSettingModal(testUser, true);
        cy.get('#replyNotificationsTitle').should('be.visible').should('have.text', 'Reply notifications').click();
        cy.get('#notificationCommentsNever').should('be.checked');
        cy.get('#notificationCommentsAny').check();
        cy.get('button#saveSetting').last().scrollIntoView().click();
        cy.apiLogout();
        cy.apiLogin(testUser);
        cy.visit(`/${testTeam.name}/channels/${testChannel.name}`);
        cy.get('[aria-label="Settings"]').click();
        cy.get('#replyNotificationsTitle').should('be.visible').should('have.text', 'Reply notifications').click();
        cy.get('#notificationCommentsAny').should('be.checked');
        cy.apiLogout();
    });
    roleNames.forEach((role) => {
        it(`MM-T5597 Verify manage user's settings option is visible for role: ${role} with Can Edit access`, () => {
            const writeAccess = true;
            if (role !== 'system_manager' && role !== 'system_read_only_admin') {
                makeUserASystemRole(testUsersForRoles[role].email, role, writeAccess);
                verifyAccessToUserSettings(testUsersForRoles[role], writeAccess);
            }
        });
    });
    roleNames.forEach((role) => {
        it(`MM-T5597 Verify manage user's settings option is Not visible for role: ${role} with Read only access`, () => {
            const writeAccess = false;
            if (role !== 'system_manager' && role !== 'system_read_only_admin') {
                makeUserASystemRole(testUsersForRoles[role].email, role, writeAccess);
                verifyAccessToUserSettings(testUsersForRoles[role], writeAccess);
            }
        });
    });
    function gotoUserConfigurationPage(user) {
        cy.intercept('**api/v4/reports/users?**').as('getUserList');
        cy.get('#input_searchTerm').clear().type(user.id);
        cy.wait('@getUserList');
        cy.get('#systemUsersTable-cell-0_emailColumn').should('have.text', user.email).click();
        cy.url().should('include', `user_management/user/${user.id}`);
    }
    function verifyManageUserSettingModal(user, writeAccess) {
        if (writeAccess) {
            cy.get('.manageUserSettingsBtn').should('be.visible').should('have.text', 'Manage User Settings').click();
            cy.get('#genericModalLabel').should('be.visible').should('have.text', `Manage ${user.nickname}'s Settings`);
            cy.get('#cancelModalButton').should('be.visible').should('have.text', 'Cancel');
            cy.get('#confirmModalButton').should('be.visible').should('have.text', 'Manage User Settings').click();
            cy.get('span#accountSettingsModalLabel').should('be.visible').should('have.text', `Manage ${user.nickname}'s Settings`);
            cy.get('.adminModeBadge').should('be.visible').should('have.text', 'Admin Mode');
        } else {
            cy.get('.manageUserSettingsBtn').should('not.exist');
        }
    }
    function makeUserASystemRole(userEmail, role, writeAccess) {
        cy.apiAdminLogin();
        cy.visit('/admin_console/user_management/system_roles');
        cy.get('.admin-console__header').within(() => {
            cy.findByText('Delegated Granular Administration', {timeout: TIMEOUTS.ONE_MIN}).should('exist').and('be.visible');
        });
        cy.findByTestId(`${role}_edit`).click();
        cy.get('button#systemRolePermissionDropdownuser_management_users').click();
        cy.get('div.PermissionSectionDropdownOptions_label').filter(`:contains("${writeAccess ? 'Can edit' : 'Read only'}")`).should('have.text', writeAccess ? 'Can edit' : 'Read only').click();
        cy.findByRole('button', {name: 'Add People'}).click().wait(TIMEOUTS.HALF_SEC);
        cy.findByRole('combobox', {name: 'Search for people'}).typeWithForce(`${userEmail}`);
        cy.get('#multiSelectList').should('be.visible').children().first().click({force: true});
        cy.findByRole('button', {name: 'Add'}).click().wait(TIMEOUTS.HALF_SEC);
        cy.findByRole('button', {name: 'Save'}).click().wait(TIMEOUTS.HALF_SEC);
        cy.apiLogout();
    }
    function verifyAccessToUserSettings(user, writeAccess) {
        cy.apiLogin(user);
        cy.visit('/admin_console/user_management/users');
        gotoUserConfigurationPage(user);
        verifyManageUserSettingModal(user, writeAccess);
        cy.apiLogout();
    }
});