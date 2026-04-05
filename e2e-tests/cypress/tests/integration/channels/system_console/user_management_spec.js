import {
    getEmailResetEmailTemplate,
    getEmailVerifyEmailTemplate,
    getRandomId,
    verifyEmailBody,
} from '../../../utils';
const TIMEOUTS = require('../../../fixtures/timeouts');
describe('User Management', () => {
    const newUsername = 'u' + getRandomId();
    const newEmailAddr = newUsername + '@sample.mattermost.com';
    let testTeam;
    let testChannel;
    let sysadmin;
    let testUser;
    before(() => {
        cy.apiInitSetup().then(({team, channel, user}) => {
            testChannel = channel;
            testTeam = team;
            testUser = user;
        });
        cy.apiAdminLogin().then((res) => {
            sysadmin = res.user;
        });
    });
    it('MM-T924 Users - Page through users list', () => {
        cy.apiGetUsers().then(({users}) => {
            const minimumNumberOfUsers = 60;
            if (users.length < minimumNumberOfUsers) {
                Cypress._.times(minimumNumberOfUsers - users.length, () => {
                    cy.apiCreateUser();
                });
            }
        });
        cy.visit('/admin_console/user_management/users');
        cy.get('.adminConsoleListTabletOptionalHead > span').then((el) => {
            const count1 = el[0].innerText.replace(/\n/g, '').replace(/\s/g, ' ');
            cy.get('.adminConsoleListTabletOptionalHead > .paginationButtons > [aria-label="Go to next page"]').should('be.visible').click();
            cy.get('.adminConsoleListTabletOptionalHead > span').then((el2) => {
                const count2 = el2[0].innerText.replace(/\n/g, '').replace(/\s/g, ' ');
                expect(count1).not.equal(count2);
            });
            cy.get('.adminConsoleListTabletOptionalHead > .paginationButtons > [aria-label="Go to previous page"]').should('be.visible').click();
        });
    });
    it('MM-T928 Users - Change a user\'s email address', () => {
        cy.visit('/admin_console/user_management/users');
        cy.apiUpdateConfig({
            EmailSettings: {
                RequireEmailVerification: true,
            },
        });
        resetUserEmail(testUser.email, '', 'Please enter a valid email address');
        resetUserEmail(testUser.email, 'user-1(at)sample.mattermost.com', 'Please enter a valid email address');
        resetUserEmail(testUser.email, 'sysadmin@sample.mattermost.com', 'An account with that email already exists.');
    });
    it('MM-T929 Users - Change a user\'s email address, with verification off', () => {
        cy.visit('/admin_console/user_management/users');
        cy.apiUpdateConfig({
            EmailSettings: {
                RequireEmailVerification: false,
            },
        });
        resetUserEmail(testUser.email, newEmailAddr, '');
        cy.get('#input_searchTerm').clear().type(newEmailAddr).wait(TIMEOUTS.HALF_SEC);
        cy.get('#systemUsersTable-cell-0_emailColumn').should('have.text', newEmailAddr);
        checkResetEmail(testUser, newEmailAddr);
        cy.apiLogout();
        apiLogin(testUser.email, testUser.password).then((response) => {
            expect(response.status).to.equal(401);
            cy.apiLogin({username: testUser.username, password: testUser.password}).apiLogout();
            cy.apiLogin({username: newEmailAddr, password: testUser.password}).apiLogout();
        });
        cy.apiAdminLogin();
        cy.visit('/admin_console/user_management/users');
        resetUserEmail(newEmailAddr, testUser.email, '');
    });
    it('MM-T930 Users - Change a user\'s email address, with verification on', () => {
        cy.visit('/admin_console/user_management/users');
        cy.apiUpdateConfig({
            EmailSettings: {
                RequireEmailVerification: true,
            },
        });
        resetUserEmail(testUser.email, newEmailAddr, '');
        cy.apiLogout();
        cy.get('#input_loginId').type(testUser.email);
        cy.get('#input_password-input').type(testUser.password);
        cy.get('#saveSetting').should('not.be.disabled').click();
        cy.url().should('include', 'should_verify_email');
        cy.apiLogout();
        verifyEmail({username: newUsername, email: newEmailAddr});
        cy.wait(TIMEOUTS.HALF_SEC);
        cy.apiLogin({username: newEmailAddr, password: testUser.password}).apiLogout();
        cy.apiAdminLogin().apiUpdateConfig({
            EmailSettings: {
                RequireEmailVerification: false,
            },
        });
        resetUserEmail(newEmailAddr, testUser.email, '');
    });
    it('MM-T931 Users - Can\'t update a user\'s email address if user has other signin method', () => {
        cy.apiUpdateConfig({
            GitLabSettings: {
                Enable: true,
            },
        });
        cy.visit('/admin_console/user_management/users');
        cy.apiCreateUser().then(({user: gitlabUser}) => {
            cy.apiUpdateUserAuth(gitlabUser.id, gitlabUser.email, '', 'gitlab');
            cy.get('#input_searchTerm').clear().type(gitlabUser.email).wait(TIMEOUTS.HALF_SEC);
            cy.get('#systemUsersTable-cell-0_emailColumn').should('contain', gitlabUser.email);
            cy.get('#systemUsersTable-cell-0_actionsColumn').click().wait(TIMEOUTS.HALF_SEC);
            cy.findByText('Switch to Email/Password').should('be.visible').click().wait(TIMEOUTS.HALF_SEC);
            cy.get('input[type=password]').type('new' + testUser.password);
            cy.get('button.btn-primary.confirm').should('contain', 'Reset').click().wait(TIMEOUTS.HALF_SEC);
            cy.get('#systemUsersTable-cell-0_actionsColumn').click().wait(TIMEOUTS.HALF_SEC);
            cy.findByText('Update email').should('be.visible');
        });
    });
    it('MM-T941 Users - Revoke all sessions for unreachable users', () => {
        cy.apiLogin(testUser);
        cy.visit(`/${testTeam.name}/channels/${testChannel.name}`);
        cy.externalRequest({user: sysadmin, method: 'post', path: `users/${testUser.id}/sessions/revoke/all`});
        cy.visit('/');
        cy.waitUntil(() => cy.url().then((url) => {
            return url.includes('/login');
        }), {timeout: TIMEOUTS.HALF_MIN});
        cy.url().should('contain', '/login');
    });
    it("MM-58840 Users - can't navigate to invalid URL", () => {
        cy.apiLogin(sysadmin);
        cy.visit('/admin_console/user_management/user/invalid');
        cy.url().should('include', '/admin_console/about/license');
    });
    it('Admin cannot access Manage User Settings option on a unlicensed instance', () => {
        cy.apiLogin(sysadmin);
        cy.visit('/admin_console/user_management/users');
        cy.intercept('**api/v4/reports/users?**').as('getUserList');
        cy.get('#input_searchTerm').clear().type(testUser.id);
        cy.wait('@getUserList');
        cy.get('#systemUsersTable-cell-0_emailColumn').should('have.text', testUser.email).as('userRow');
        cy.get('#actionMenuButton-systemUsersTable-0 > span').click();
        cy.get('ul#actionMenu-systemUsersTable-0').should('be.visible').find('li').should('not.contain.text', 'Manage User Settings');
        cy.get('@userRow').click({force: true});
        cy.get('.manageUserSettingsBtn').
            should('be.visible').
            should('contain.text', 'Manage User Settings').
            should('have.class', 'disabled');
    });
    function resetUserEmail(oldEmail, newEmail, errorMsg) {
        cy.visit('/admin_console/user_management/users');
        cy.get('#input_searchTerm').clear().type(oldEmail).wait(TIMEOUTS.HALF_SEC);
        cy.get('#systemUsersTable-cell-0_emailColumn').should('contain', oldEmail);
        cy.get('#systemUsersTable-cell-0_actionsColumn').click().wait(TIMEOUTS.HALF_SEC);
        cy.findByText('Update email').click().wait(TIMEOUTS.HALF_SEC);
        cy.get('#resetEmailModal').should('exist');
        if (newEmail.length > 0) {
            cy.get('input[type=email]').eq(0).clear().type(newEmail);
        }
        cy.get('button.btn-primary.confirm').click();
        if (errorMsg.length > 0) {
            cy.get('.Input___error').should('be.visible').and('contain', errorMsg);
            cy.get('button.close').click();
        }
    }
    function checkResetEmail(user, newEmail) {
        cy.getRecentEmail(user).then((data) => {
            const {body: actualEmailBody, subject} = data;
            expect(subject).to.contain('Your email address has changed');
            const expectedEmailBody = getEmailResetEmailTemplate(newEmail);
            verifyEmailBody(expectedEmailBody, actualEmailBody);
        });
    }
    function verifyEmail(user) {
        const baseUrl = Cypress.config('baseUrl');
        cy.getRecentEmail(user).then((data) => {
            const {body: actualEmailBody, subject} = data;
            expect(subject).to.contain('Email Verification');
            const expectedEmailBody = getEmailVerifyEmailTemplate(user.email);
            verifyEmailBody(expectedEmailBody, actualEmailBody);
            const line = actualEmailBody[4].split(' ');
            const verificationLink = line[3].replace(baseUrl, '');
            cy.visit(verificationLink);
            cy.findByText('Email Verified').should('be.visible');
            cy.get('#input_loginId').should('be.visible').and('have.value', user.email);
        });
    }
    function apiLogin(username, password) {
        return cy.request({
            headers: {'X-Requested-With': 'XMLHttpRequest'},
            url: '/api/v4/users/login',
            method: 'POST',
            body: {login_id: username, password},
            failOnStatusCode: false,
        });
    }
});