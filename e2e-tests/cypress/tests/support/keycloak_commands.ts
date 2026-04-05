import {ChainableT} from 'tests/types';
import * as TIMEOUTS from '../fixtures/timeouts';
import {LdapUser} from './ldap_server_commands';
const {
    keycloakBaseUrl,
    keycloakAppName,
} = Cypress.env();
const baseUrl = `${keycloakBaseUrl}/auth/admin/realms/${keycloakAppName}`;
const loginUrl = `${keycloakBaseUrl}/auth/realms/master/protocol/openid-connect/token`;
function buildProfile(user) {
    return {
        firstName: user.firstname,
        lastName: user.lastname,
        email: user.email,
        username: user.username,
        enabled: true,
    };
}
function keycloakGetAccessTokenAPI(): ChainableT<string> {
    return cy.task('keycloakRequest', {
        baseUrl: loginUrl,
        path: '',
        method: 'post',
        headers: {'Content-type': 'application/x-www-form-urlencoded'},
        data: 'grant_type=password&username=mmuser&password=mostest&client_id=admin-cli',
    }).then((response: any) => {
        expect(response.status).to.equal(200);
        const token: string = response.data.access_token;
        return cy.wrap(token);
    });
}
Cypress.Commands.add('keycloakGetAccessTokenAPI', keycloakGetAccessTokenAPI);
function keycloakCreateUserAPI(accessToken: string, user: any = {}): ChainableT {
    const profile = buildProfile(user);
    return cy.task('keycloakRequest', {
        baseUrl,
        path: 'users',
        method: 'post',
        data: profile,
        headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${accessToken}`,
        },
    }).then((response: Response) => {
        expect(response.status).to.equal(201);
    });
}
Cypress.Commands.add('keycloakCreateUserAPI', keycloakCreateUserAPI);
function keycloakResetPasswordAPI(accessToken: string, userId: string, password: string): ChainableT {
    return cy.task('keycloakRequest', {
        baseUrl,
        path: `users/${userId}/reset-password`,
        method: 'put',
        headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${accessToken}`,
        },
        data: {type: 'password', temporary: false, value: password},
    }).then((response: any) => {
        if (response.status === 200 && response.data.length > 0) {
            return cy.wrap(response.data[0].id);
        }
        return null;
    });
}
Cypress.Commands.add('keycloakResetPasswordAPI', keycloakResetPasswordAPI);
function keycloakGetUserAPI(accessToken: string, email: string): ChainableT<string> {
    return cy.task('keycloakRequest', {
        baseUrl,
        path: 'users?email=' + email,
        method: 'get',
        headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${accessToken}`,
        },
    }).then((response: any) => {
        if (response.status === 200 && response.data.length > 0) {
            return cy.wrap<string>(response.data[0].id);
        }
        return null;
    });
}
Cypress.Commands.add('keycloakGetUserAPI', keycloakGetUserAPI);
function keycloakDeleteUserAPI(accessToken: string, userId: string): ChainableT {
    return cy.task('keycloakRequest', {
        baseUrl,
        path: `users/${userId}`,
        method: 'delete',
        headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${accessToken}`,
        },
    }).then((response: any) => {
        expect(response.status).to.equal(204);
    });
}
Cypress.Commands.add('keycloakDeleteUserAPI', keycloakDeleteUserAPI);
function keycloakUpdateUserAPI(accessToken: string, userId: string, data: any): ChainableT {
    return cy.task('keycloakRequest', {
        baseUrl,
        path: 'users/' + userId,
        method: 'put',
        headers: {
            Authorization: `Bearer ${accessToken}`,
        },
        data,
    }).then((response: any) => {
        expect(response.status).to.equal(204);
    });
}
Cypress.Commands.add('keycloakUpdateUserAPI', keycloakUpdateUserAPI);
function keycloakDeleteSessionAPI(accessToken: string, sessionId: string): ChainableT {
    return cy.task('keycloakRequest', {
        baseUrl,
        path: `sessions/${sessionId}`,
        method: 'delete',
        headers: {
            Authorization: `Bearer ${accessToken}`,
        },
    }).then((delResponse: any) => {
        expect(delResponse.status).to.equal(204);
    });
}
Cypress.Commands.add('keycloakDeleteSessionAPI', keycloakDeleteSessionAPI);
function keycloakGetUserSessionsAPI(accessToken: string, userId: string): ChainableT<string[]> {
    return cy.task('keycloakRequest', {
        baseUrl,
        path: `users/${userId}/sessions`,
        method: 'get',
        headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${accessToken}`,
        },
    }).then((response: any) => {
        expect(response.status).to.equal(200);
        expect(response.data);
        return cy.wrap<string[]>(response.data);
    });
}
Cypress.Commands.add('keycloakGetUserSessionsAPI', keycloakGetUserSessionsAPI);
function keycloakDeleteUserSessions(accessToken: string, userId: string): ChainableT {
    return cy.keycloakGetUserSessionsAPI(accessToken, userId).then((responseData) => {
        if (responseData.length > 0) {
            responseData.forEach((sessionId) => {
                cy.keycloakDeleteSessionAPI(accessToken, sessionId);
            });
            ['JSESSIONID'].forEach((cookie) => {
                cy.clearCookie(cookie);
            });
        }
    });
}
Cypress.Commands.add('keycloakDeleteUserSessions', keycloakDeleteUserSessions);
function keycloakResetUsers(users: any[]): ChainableT {
    return cy.keycloakGetAccessTokenAPI().then((accessToken) => {
        users.forEach((_user) => {
            cy.keycloakGetUserAPI(accessToken, _user.email).then((userId) => {
                if (userId) {
                    cy.keycloakDeleteUserAPI(accessToken, userId);
                }
            }).then(() => {
                cy.keycloakCreateUser(accessToken, _user).then((_id) => {
                    _user.keycloakId = _id;
                });
            });
        });
    });
}
Cypress.Commands.add('keycloakResetUsers', keycloakResetUsers);
function keycloakCreateUser(accessToken: string, user: any): ChainableT {
    return cy.keycloakCreateUserAPI(accessToken, user).then(() => {
        cy.keycloakGetUserAPI(accessToken, user.email).then((newId) => {
            cy.keycloakResetPasswordAPI(accessToken, newId, user.password).then(() => {
                cy.keycloakDeleteUserSessions(accessToken, newId).then(() => {
                    return cy.wrap(newId);
                });
            });
        });
    });
}
Cypress.Commands.add('keycloakCreateUser', keycloakCreateUser);
function keycloakCreateUsers(users = []) {
    return cy.keycloakGetAccessTokenAPI().then((accessToken) => {
        return users.forEach((user) => {
            return cy.keycloakCreateUser(accessToken, user);
        });
    });
}
Cypress.Commands.add('keycloakCreateUsers', keycloakCreateUsers);
function keycloakUpdateUser(userEmail: string, data: any) {
    return cy.keycloakGetAccessTokenAPI().then((accessToken) => {
        return cy.keycloakGetUserAPI(accessToken, userEmail).then((userId) => {
            return cy.keycloakUpdateUserAPI(accessToken, userId, data);
        });
    });
}
Cypress.Commands.add('keycloakUpdateUser', keycloakUpdateUser);
function keycloakSuspendUser(userEmail: string) {
    const data = {enabled: false};
    cy.keycloakUpdateUser(userEmail, data);
}
Cypress.Commands.add('keycloakSuspendUser', keycloakSuspendUser);
function keycloakUnsuspendUser(userEmail: string): ChainableT {
    const data = {enabled: true};
    return cy.keycloakUpdateUser(userEmail, data);
}
Cypress.Commands.add('keycloakUnsuspendUser', keycloakUnsuspendUser);
function checkKeycloakLoginPage() {
    cy.findByText('Username or email', {timeout: TIMEOUTS.ONE_SEC}).should('be.visible');
    cy.findByText('Password').should('be.visible');
    cy.findAllByText('Log In').should('be.visible');
}
Cypress.Commands.add('checkKeycloakLoginPage', checkKeycloakLoginPage);
function doKeycloakLogin(user: LdapUser) {
    cy.apiLogout();
    cy.visit('/login');
    cy.findByText('SAML').click();
    cy.findByText('Username or email').type(user.email);
    cy.findByText('Password').type(user.password);
    cy.findAllByText('Log In').last().click();
}
Cypress.Commands.add('doKeycloakLogin', doKeycloakLogin);
function verifyKeycloakLoginFailed() {
    cy.findAllByText('Account is disabled, contact your administrator.').should('be.visible');
}
Cypress.Commands.add('verifyKeycloakLoginFailed', verifyKeycloakLoginFailed);
declare global {
    namespace Cypress {
        interface Chainable {
            keycloakCreateUsers: typeof keycloakCreateUsers;
            keycloakUpdateUser: typeof keycloakUpdateUser;
            keycloakGetAccessTokenAPI: typeof keycloakGetAccessTokenAPI;
            keycloakCreateUserAPI: typeof keycloakCreateUserAPI;
            keycloakResetPasswordAPI: typeof keycloakResetPasswordAPI;
            keycloakGetUserAPI: typeof keycloakGetUserAPI;
            keycloakDeleteUserAPI: typeof keycloakDeleteUserAPI;
            keycloakUpdateUserAPI: typeof keycloakUpdateUserAPI;
            keycloakDeleteSessionAPI: typeof keycloakDeleteSessionAPI;
            keycloakGetUserSessionsAPI: typeof keycloakGetUserSessionsAPI;
            keycloakDeleteUserSessions: typeof keycloakDeleteUserSessions;
            keycloakResetUsers: typeof keycloakResetUsers;
            keycloakCreateUser: typeof keycloakCreateUser;
            keycloakSuspendUser(userEmail: string): ChainableT<void>;
            keycloakUnsuspendUser: typeof keycloakUnsuspendUser;
            checkKeycloakLoginPage: typeof checkKeycloakLoginPage;
            doKeycloakLogin(user: LdapUser): ChainableT<void>;
            verifyKeycloakLoginFailed: typeof verifyKeycloakLoginFailed;
        }
    }
}