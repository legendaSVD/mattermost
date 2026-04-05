import * as TIMEOUTS from '../../../../fixtures/timeouts';
describe('System Console > User Management > Users', () => {
    let testUser;
    let otherAdmin;
    before(() => {
        cy.apiInitSetup().then(({user}) => {
            testUser = user;
        });
        cy.apiCreateCustomAdmin().then(({sysadmin}) => {
            otherAdmin = sysadmin;
        });
    });
    beforeEach(() => {
        cy.apiLogin(otherAdmin);
        cy.visit('/admin_console');
        cy.findByTestId('user_management.system_users').
            click().
            wait(TIMEOUTS.ONE_SEC);
    });
    it('MM-T925 Users - Profile image on User Configuration page is round', () => {
        cy.findByPlaceholderText('Search users').
            should('be.visible').
            clear().
            type(testUser.email).
            wait(TIMEOUTS.HALF_SEC);
        cy.findByText(`${testUser.username}`).
            should('be.visible').
            click({force: true});
        cy.location('pathname').should(
            'equal',
            `/admin_console/user_management/user/${testUser.id}`,
        );
        cy.findByAltText('user profile image').
            should('be.visible').
            and('have.css', 'border-radius', '50%');
    });
    it('MM-T932 Users - Change a user\'s password', () => {
        cy.findByPlaceholderText('Search users').type(testUser.email).wait(TIMEOUTS.HALF_SEC);
        cy.get('#systemUsersTable-cell-0_emailColumn').should('contain', testUser.email);
        cy.get('#systemUsersTable-cell-0_actionsColumn').click().wait(TIMEOUTS.HALF_SEC);
        cy.findByText('Reset password').click();
        cy.get('input[type=password]').type('new' + testUser.password);
        cy.get('button.btn-primary.confirm').should('contain', 'Reset').click().wait(TIMEOUTS.HALF_SEC);
        cy.apiLogout();
        apiLogin(testUser.username, testUser.password).then((response) => {
            expect(response.status).to.equal(401);
            testUser.password = 'new' + testUser.password;
            cy.apiLogin(testUser);
            cy.apiLogout();
        });
    });
    it('MM-T933 Users - System admin changes own password - Cancel out of changes', () => {
        cy.findByPlaceholderText('Search users').type(otherAdmin.username).wait(TIMEOUTS.HALF_SEC);
        cy.get('#systemUsersTable-cell-0_emailColumn').should('contain', otherAdmin.email);
        cy.get('#systemUsersTable-cell-0_actionsColumn').click().wait(TIMEOUTS.HALF_SEC);
        cy.findByText('Reset password').click();
        cy.get('input[type=password]').eq(0).type(otherAdmin.password);
        cy.get('input[type=password]').eq(1).type('new' + otherAdmin.password);
        cy.get('.modal-footer > .btn-tertiary').should('contain', 'Cancel').click().wait(TIMEOUTS.HALF_SEC);
        cy.apiLogout();
        cy.apiLogin(otherAdmin);
    });
    it('MM-T934 Users - System admin changes own password - Incorrect old password', () => {
        cy.findByPlaceholderText('Search users').type(otherAdmin.username).wait(TIMEOUTS.HALF_SEC);
        cy.get('#systemUsersTable-cell-0_emailColumn').should('contain', otherAdmin.email);
        cy.get('#systemUsersTable-cell-0_actionsColumn').click().wait(TIMEOUTS.HALF_SEC);
        cy.findByText('Reset password').click();
        cy.get('input[type=password]').eq(0).type('wrong' + otherAdmin.password);
        cy.get('input[type=password]').eq(1).type('new' + otherAdmin.password);
        cy.get('button.btn-primary.confirm').should('contain', 'Reset').click().wait(TIMEOUTS.HALF_SEC);
        cy.get('.genericModalError .error').should('be.visible').
            and('contain', 'The "Current Password" you entered is incorrect. Please check that Caps Lock is off and try again.');
    });
    it('MM-T935 Users - System admin changes own password - Invalid new password', () => {
        cy.findByPlaceholderText('Search users').type(otherAdmin.username).wait(TIMEOUTS.HALF_SEC);
        cy.get('#systemUsersTable-cell-0_emailColumn').should('contain', otherAdmin.email);
        cy.get('#systemUsersTable-cell-0_actionsColumn').click().wait(TIMEOUTS.HALF_SEC);
        cy.findByText('Reset password').click();
        cy.get('input[type=password]').eq(0).type(otherAdmin.password);
        cy.get('input[type=password]').eq(1).type('new');
        cy.get('button.btn-primary.confirm').should('contain', 'Reset').click().wait(TIMEOUTS.HALF_SEC);
        cy.get('.Input___error').should('be.visible').and('contain', 'characters long');
    });
    it('MM-T936 Users - System admin changes own password - Blank fields', () => {
        cy.findByPlaceholderText('Search users').type(otherAdmin.username).wait(TIMEOUTS.HALF_SEC);
        cy.get('#systemUsersTable-cell-0_emailColumn').should('contain', otherAdmin.email);
        cy.get('#systemUsersTable-cell-0_actionsColumn').click().wait(TIMEOUTS.HALF_SEC);
        cy.findByText('Reset password').click();
        cy.get('button.btn-primary.confirm').should('contain', 'Reset').click().wait(TIMEOUTS.HALF_SEC);
        cy.get('.genericModalError .error').should('be.visible').
            and('contain', 'Please enter your current password.');
        cy.get('input[type=password]').eq(0).type(otherAdmin.password);
        cy.get('button.btn-primary.confirm').should('contain', 'Reset').click().wait(TIMEOUTS.HALF_SEC);
        cy.get('.Input___error').should('be.visible').and('contain', 'characters long');
    });
    it('MM-T937 Users - System admin changes own password - Successfully changed', () => {
        cy.findByPlaceholderText('Search users').type(otherAdmin.username).wait(TIMEOUTS.HALF_SEC);
        cy.get('#systemUsersTable-cell-0_emailColumn').should('contain', otherAdmin.email);
        cy.get('#systemUsersTable-cell-0_actionsColumn').click().wait(TIMEOUTS.HALF_SEC);
        cy.findByText('Reset password').click();
        cy.get('input[type=password]').eq(0).type(otherAdmin.password);
        cy.get('input[type=password]').eq(1).type('new' + otherAdmin.password);
        cy.get('button.btn-primary.confirm').should('contain', 'Reset').click().wait(TIMEOUTS.HALF_SEC);
        cy.apiLogout();
        apiLogin(otherAdmin.username, otherAdmin.password).then((response) => {
            expect(response.status).to.equal(401);
            otherAdmin.password = 'new' + otherAdmin.password;
            cy.apiLogin(otherAdmin);
            cy.apiResetPassword('me', otherAdmin.password, otherAdmin.password.substr(3));
        });
    });
});
function apiLogin(username, password) {
    return cy.request({
        headers: {'X-Requested-With': 'XMLHttpRequest'},
        url: '/api/v4/users/login',
        method: 'POST',
        body: {login_id: username, password},
        failOnStatusCode: false,
    });
}