import {UserAccessToken, UserProfile} from '@mattermost/types/users';
import authenticator from 'authenticator';
import {ChainableT} from 'tests/types';
import {getRandomId} from '../../utils';
import {getAdminAccount} from '../env';
import {buildQueryString} from './helpers';
function apiLogin(user: Partial<Pick<UserProfile, 'username' | 'email' | 'password'>>, requestOptions: Record<string, any> = {}): ChainableT<{user: UserProfile} | {error: any}> {
    return cy.request<UserProfile | any>({
        headers: {'X-Requested-With': 'XMLHttpRequest'},
        url: '/api/v4/users/login',
        method: 'POST',
        body: {login_id: user.username || user.email, password: user.password},
        ...requestOptions,
    }).then((response) => {
        if (requestOptions.failOnStatusCode) {
            expect(response.status).to.equal(200);
        }
        if (response.status === 200) {
            return cy.wrap<{user: UserProfile}>({
                user: {
                    ...response.body,
                    password: user.password,
                },
            });
        }
        return cy.wrap({error: response.body});
    });
}
Cypress.Commands.add('apiLogin', apiLogin);
function apiLoginWithMFA(user: {username: string; password: string}, token: string): ChainableT<{user: UserProfile}> {
    return cy.request({
        headers: {'X-Requested-With': 'XMLHttpRequest'},
        url: '/api/v4/users/login',
        method: 'POST',
        body: {login_id: user.username, password: user.password, token},
    }).then((response) => {
        expect(response.status).to.equal(200);
        return cy.wrap<{user: UserProfile}>({
            user: {
                ...response.body,
                password: user.password,
            },
        });
    });
}
Cypress.Commands.add('apiLoginWithMFA', apiLoginWithMFA);
function apiAdminLogin(requestOptions?: Record<string, any>): ChainableT<{user: UserProfile}> {
    const admin = getAdminAccount();
    return cy.apiLogin(admin, requestOptions).then((resp) => {
        if ((<{error: any}>resp).error) {
            if ((<{error: any}>resp).error.id === 'mfa.validate_token.authenticate.app_error') {
                return cy.dbGetUser({username: admin.username}).then(({user: {mfasecret}}) => {
                    const token = authenticator.generateToken(mfasecret);
                    return cy.apiLoginWithMFA(admin, token);
                });
            }
            delete admin.username;
            return cy.apiLogin(admin, requestOptions) as ChainableT<{user: UserProfile}>;
        }
        return cy.wrap(resp as {user: UserProfile});
    });
}
Cypress.Commands.add('apiAdminLogin', apiAdminLogin);
function apiAdminLoginWithMFA(token): ChainableT<{user: UserProfile}> {
    const admin = getAdminAccount();
    return cy.apiLoginWithMFA(admin, token);
}
Cypress.Commands.add('apiAdminLoginWithMFA', apiAdminLoginWithMFA);
function apiLogout() {
    cy.request({
        headers: {'X-Requested-With': 'XMLHttpRequest'},
        url: '/api/v4/users/logout',
        method: 'POST',
        log: false,
    });
    cy.visit('/login?extra=expired').url().should('include', '/login');
    ['MMAUTHTOKEN', 'MMUSERID', 'MMCSRF'].forEach((cookie) => {
        cy.clearCookie(cookie);
    });
    cy.clearCookies();
}
Cypress.Commands.add('apiLogout', apiLogout);
function apiGetMe(): ChainableT<{user: UserProfile}> {
    return cy.apiGetUserById('me');
}
Cypress.Commands.add('apiGetMe', apiGetMe);
function apiGetUserById(userId: string): ChainableT<{user: UserProfile}> {
    return cy.request({
        headers: {'X-Requested-With': 'XMLHttpRequest'},
        url: '/api/v4/users/' + userId,
    }).then((response) => {
        expect(response.status).to.equal(200);
        return cy.wrap({user: response.body});
    });
}
Cypress.Commands.add('apiGetUserById', apiGetUserById);
function apiGetUserByEmail(email: string, failOnStatusCode = true): ChainableT<{user: UserProfile}> {
    return cy.request({
        headers: {'X-Requested-With': 'XMLHttpRequest'},
        url: '/api/v4/users/email/' + email,
        failOnStatusCode,
    }).then((response) => {
        const {body, status} = response;
        if (failOnStatusCode) {
            expect(status).to.equal(200);
            return cy.wrap({user: body});
        }
        return cy.wrap({user: status === 200 ? body : null});
    });
}
Cypress.Commands.add('apiGetUserByEmail', apiGetUserByEmail);
function apiGetUsersByUsernames(usernames: string[] = []): ChainableT<{users: UserProfile[]}> {
    return cy.request({
        headers: {'X-Requested-With': 'XMLHttpRequest'},
        url: '/api/v4/users/usernames',
        method: 'POST',
        body: usernames,
    }).then((response) => {
        expect(response.status).to.equal(200);
        return cy.wrap({users: response.body});
    });
}
Cypress.Commands.add('apiGetUsersByUsernames', apiGetUsersByUsernames);
function apiPatchUser(userId: string, userData: Partial<UserProfile>): ChainableT<{user: UserProfile}> {
    return cy.request({
        headers: {'X-Requested-With': 'XMLHttpRequest'},
        method: 'PUT',
        url: `/api/v4/users/${userId}/patch`,
        body: userData,
    }).then((response) => {
        expect(response.status).to.equal(200);
        return cy.wrap({user: response.body});
    });
}
Cypress.Commands.add('apiPatchUser', apiPatchUser);
function apiPatchMe(data: Partial<UserProfile>): ChainableT<{user: UserProfile}> {
    return cy.request({
        headers: {'X-Requested-With': 'XMLHttpRequest'},
        url: '/api/v4/users/me/patch',
        method: 'PUT',
        body: data,
    }).then((response) => {
        expect(response.status).to.equal(200);
        return cy.wrap({user: response.body});
    });
}
Cypress.Commands.add('apiPatchMe', apiPatchMe);
function apiCreateCustomAdmin({loginAfter = false, hideAdminTrialModal = true} = {}): ChainableT<{sysadmin: UserProfile}> {
    const sysadminUser = generateRandomUser('other-admin');
    return cy.apiCreateUser({user: sysadminUser}).then(({user}) => {
        return cy.apiPatchUserRoles(user.id, ['system_admin', 'system_user']).then(() => {
            const data = {sysadmin: user};
            cy.apiSaveStartTrialModal(user.id, hideAdminTrialModal.toString());
            if (loginAfter) {
                return cy.apiLogin(user).then(() => {
                    return cy.wrap(data);
                });
            }
            return cy.wrap(data);
        });
    });
}
Cypress.Commands.add('apiCreateCustomAdmin', apiCreateCustomAdmin);
function apiCreateAdmin() {
    const {username, password} = getAdminAccount();
    const sysadminUser = {
        username,
        password,
        first_name: 'Kenneth',
        last_name: 'Moreno',
        email: 'sysadmin@sample.mattermost.com',
    };
    const options = {
        headers: {'X-Requested-With': 'XMLHttpRequest'},
        method: 'POST',
        url: '/api/v4/users',
        body: sysadminUser,
    };
    return cy.request(options).then((res) => {
        expect(res.status).to.equal(201);
        return cy.wrap({sysadmin: {...res.body, password}});
    });
}
Cypress.Commands.add('apiCreateAdmin', apiCreateAdmin);
function generateRandomUser(prefix = 'user', createAt = 0): Partial<UserProfile> {
    const randomId = getRandomId();
    return {
        email: `${prefix}${randomId}@sample.mattermost.com`,
        username: `${prefix}${randomId}`,
        password: 'passwd',
        first_name: `First${randomId}`,
        last_name: `Last${randomId}`,
        nickname: `Nickname${randomId}`,
        create_at: createAt,
    };
}
interface CreateUserOptions {
    user: Partial<UserProfile>;
    prefix?: string;
    createAt?: number;
    bypassTutorial?: boolean;
    hideOnboarding: boolean;
    bypassWhatsNewModal: boolean;
}
function apiCreateUser({
    prefix = 'user',
    createAt = 0,
    bypassTutorial = true,
    hideOnboarding = true,
    bypassWhatsNewModal = true,
    user = null,
}: Partial<CreateUserOptions> = {}): ChainableT<{user: UserProfile}> {
    const newUser = user || generateRandomUser(prefix, createAt);
    const createUserOption = {
        headers: {'X-Requested-With': 'XMLHttpRequest'},
        method: 'POST',
        url: '/api/v4/users',
        body: newUser,
    };
    return cy.request(createUserOption).then((userRes) => {
        expect(userRes.status).to.equal(201);
        const createdUser = userRes.body;
        cy.apiSaveSkipStepsPreference(createdUser.id, 'true');
        cy.apiSaveOnboardingTaskListPreference(createdUser.id, 'onboarding_task_list_open', 'false');
        cy.apiSaveOnboardingTaskListPreference(createdUser.id, 'onboarding_task_list_show', 'false');
        if (bypassTutorial) {
            cy.apiDisableTutorials(createdUser.id);
        }
        if (hideOnboarding) {
            cy.apiSaveOnboardingPreference(createdUser.id, 'hide', 'true');
            cy.apiSaveOnboardingPreference(createdUser.id, 'skip', 'true');
        }
        if (bypassWhatsNewModal) {
            cy.apiHideSidebarWhatsNewModalPreference(createdUser.id, 'false');
        }
        return cy.wrap({user: {...createdUser, password: newUser.password}});
    });
}
Cypress.Commands.add('apiCreateUser', apiCreateUser);
function apiCreateGuestUser({
    prefix = 'guest',
    bypassTutorial = true,
}: Partial<CreateUserOptions>): ChainableT<{guest: UserProfile}> {
    return cy.apiCreateUser({prefix, bypassTutorial}).then(({user}) => {
        cy.apiDemoteUserToGuest(user.id);
        return cy.wrap({guest: user});
    });
}
Cypress.Commands.add('apiCreateGuestUser', apiCreateGuestUser);
function apiRevokeUserSessions(userId: string): ChainableT<Record<string, any>> {
    return cy.request({
        headers: {'X-Requested-With': 'XMLHttpRequest'},
        url: `/api/v4/users/${userId}/sessions/revoke/all`,
        method: 'POST',
    }).then((response) => {
        expect(response.status).to.equal(200);
        return cy.wrap({data: response.body});
    });
}
Cypress.Commands.add('apiRevokeUserSessions', apiRevokeUserSessions);
function apiGetUsers(queryParams: Record<string, any>): ChainableT<{users: UserProfile[]}> {
    const queryString = buildQueryString(queryParams);
    return cy.request({
        method: 'GET',
        url: `/api/v4/users?${queryString}`,
        headers: {'X-Requested-With': 'XMLHttpRequest'},
    }).then((response) => {
        expect(response.status).to.equal(200);
        return cy.wrap({users: response.body as UserProfile[]});
    });
}
Cypress.Commands.add('apiGetUsers', apiGetUsers);
function apiGetUsersNotInTeam({teamId, page = 0, perPage = 60}: Record<string, any>): ChainableT<{users: UserProfile[]}> {
    return cy.apiGetUsers({not_in_team: teamId, page, per_page: perPage});
}
Cypress.Commands.add('apiGetUsersNotInTeam', apiGetUsersNotInTeam);
function apiPatchUserRoles(userId: string, roleNames: string[] = ['system_user']): any {
    return cy.request({
        headers: {'X-Requested-With': 'XMLHttpRequest'},
        url: `/api/v4/users/${userId}/roles`,
        method: 'PUT',
        body: {roles: roleNames.join(' ')},
    }).then((response) => {
        expect(response.status).to.equal(200);
        return cy.wrap({user: response.body});
    });
}
Cypress.Commands.add('apiPatchUserRoles', apiPatchUserRoles);
function apiDeactivateUser(userId: string): ChainableT<any> {
    const options = {
        headers: {'X-Requested-With': 'XMLHttpRequest'},
        method: 'DELETE',
        url: `/api/v4/users/${userId}`,
    };
    return cy.request(options).then((response) => {
        expect(response.status).to.equal(200);
        return cy.wrap(response);
    });
}
Cypress.Commands.add('apiDeactivateUser', apiDeactivateUser);
function apiActivateUser(userId: string): ChainableT<any> {
    const options = {
        headers: {'X-Requested-With': 'XMLHttpRequest'},
        method: 'PUT',
        url: `/api/v4/users/${userId}/active`,
        body: {
            active: true,
        },
    };
    return cy.request(options).then((response) => {
        expect(response.status).to.equal(200);
        return cy.wrap(response);
    });
}
Cypress.Commands.add('apiActivateUser', apiActivateUser);
function apiDemoteUserToGuest(userId: string): ChainableT<{guest: UserProfile}> {
    return cy.request({
        headers: {'X-Requested-With': 'XMLHttpRequest'},
        url: `/api/v4/users/${userId}/demote`,
        method: 'POST',
    }).then((response) => {
        expect(response.status).to.equal(200);
        return cy.apiGetUserById(userId).then(({user}) => {
            return cy.wrap({guest: user});
        });
    });
}
Cypress.Commands.add('apiDemoteUserToGuest', apiDemoteUserToGuest);
function apiPromoteGuestToUser(userId: string): ChainableT<{user: UserProfile}> {
    return cy.request({
        headers: {'X-Requested-With': 'XMLHttpRequest'},
        url: `/api/v4/users/${userId}/promote`,
        method: 'POST',
    }).then((response) => {
        expect(response.status).to.equal(200);
        return cy.apiGetUserById(userId);
    });
}
Cypress.Commands.add('apiPromoteGuestToUser', apiPromoteGuestToUser);
function apiVerifyUserEmailById(userId: string): ChainableT<{user: UserProfile}> {
    const options = {
        headers: {'X-Requested-With': 'XMLHttpRequest'},
        method: 'POST',
        url: `/api/v4/users/${userId}/email/verify/member`,
    };
    return cy.request(options).then((response) => {
        expect(response.status).to.equal(200);
        return cy.wrap({user: response.body});
    });
}
Cypress.Commands.add('apiVerifyUserEmailById', apiVerifyUserEmailById);
function apiActivateUserMFA(userId: string, activate: boolean, token: string): ChainableT<any> {
    return cy.request({
        headers: {'X-Requested-With': 'XMLHttpRequest'},
        url: `/api/v4/users/${userId}/mfa`,
        method: 'PUT',
        body: {
            activate,
            code: token,
        },
    }).then((response) => {
        expect(response.status).to.equal(200);
        return cy.wrap(response);
    });
}
Cypress.Commands.add('apiActivateUserMFA', apiActivateUserMFA);
function apiResetPassword(userId, currentPass, newPass) {
    return cy.request({
        headers: {'X-Requested-With': 'XMLHttpRequest'},
        method: 'PUT',
        url: `/api/v4/users/${userId}/password`,
        body: {
            current_password: currentPass,
            new_password: newPass,
        },
    }).then((response) => {
        expect(response.status).to.equal(200);
        return cy.wrap({user: response.body});
    });
}
Cypress.Commands.add('apiResetPassword', apiResetPassword);
function apiGenerateMfaSecret(userId) {
    return cy.request({
        headers: {'X-Requested-With': 'XMLHttpRequest'},
        method: 'POST',
        url: `/api/v4/users/${userId}/mfa/generate`,
    }).then((response) => {
        expect(response.status).to.equal(200);
        return cy.wrap({code: response.body});
    });
}
Cypress.Commands.add('apiGenerateMfaSecret', apiGenerateMfaSecret);
function apiAccessToken(userId: string, description: string): ChainableT<UserAccessToken> {
    return cy.request({
        headers: {'X-Requested-With': 'XMLHttpRequest'},
        url: '/api/v4/users/' + userId + '/tokens',
        method: 'POST',
        body: {
            description,
        },
    }).then((response) => {
        expect(response.status).to.equal(200);
        return cy.wrap(response.body as UserAccessToken);
    });
}
Cypress.Commands.add('apiAccessToken', apiAccessToken);
function apiRevokeAccessToken(tokenId: string): ChainableT<any> {
    return cy.request({
        headers: {'X-Requested-With': 'XMLHttpRequest'},
        url: '/api/v4/users/tokens/revoke',
        method: 'POST',
        body: {
            token_id: tokenId,
        },
    }).then((response) => {
        expect(response.status).to.equal(200);
        return cy.wrap(response);
    });
}
Cypress.Commands.add('apiRevokeAccessToken', apiRevokeAccessToken);
function apiUpdateUserAuth(userId: string, authData: string, password: string, authService: string): ChainableT<any> {
    return cy.request({
        headers: {'X-Requested-With': 'XMLHttpRequest'},
        method: 'PUT',
        url: `/api/v4/users/${userId}/auth`,
        body: {
            auth_data: authData,
            password,
            auth_service: authService,
        },
    }).then((response) => {
        expect(response.status).to.equal(200);
        return cy.wrap(response);
    });
}
Cypress.Commands.add('apiUpdateUserAuth', apiUpdateUserAuth);
function apiGetTotalUsers(): ChainableT<number> {
    return cy.request({
        headers: {'X-Requested-With': 'XMLHttpRequest'},
        method: 'GET',
        url: '/api/v4/users/stats',
    }).then((response) => {
        expect(response.status).to.equal(200);
        return cy.wrap(response.body.total_users_count as number);
    });
}
Cypress.Commands.add('apiGetTotalUsers', apiGetTotalUsers);
export {generateRandomUser};
declare global {
    namespace Cypress {
        interface Chainable {
            apiLogin: typeof apiLogin;
            apiLoginWithMFA: typeof apiLoginWithMFA;
            apiAdminLogin: typeof apiAdminLogin;
            apiAdminLoginWithMFA: typeof apiAdminLoginWithMFA;
            apiLogout(): ChainableT<void>;
            apiGetMe: typeof apiGetMe;
            apiGetUserById: typeof apiGetUserById;
            apiGetUserByEmail: typeof apiGetUserByEmail;
            apiGetUsersByUsernames: typeof apiGetUsersByUsernames;
            apiPatchUser: typeof apiPatchUser;
            apiPatchMe: typeof apiPatchMe;
            apiCreateCustomAdmin: typeof apiCreateCustomAdmin;
            apiCreateAdmin: typeof apiCreateAdmin;
            apiCreateUser: typeof apiCreateUser;
            apiCreateGuestUser: typeof apiCreateGuestUser;
            apiRevokeUserSessions: typeof apiRevokeUserSessions;
            apiGetUsers: typeof apiGetUsers;
            apiGetUsersNotInTeam: typeof apiGetUsersNotInTeam;
            apiPatchUserRoles: typeof apiPatchUserRoles;
            apiDeactivateUser: typeof apiDeactivateUser;
            apiActivateUser: typeof apiActivateUser;
            apiDemoteUserToGuest: typeof apiDemoteUserToGuest;
            apiPromoteGuestToUser: typeof apiPromoteGuestToUser;
            apiVerifyUserEmailById: typeof apiVerifyUserEmailById;
            apiActivateUserMFA: typeof apiActivateUserMFA;
            apiResetPassword: typeof apiResetPassword;
            apiGenerateMfaSecret: typeof apiGenerateMfaSecret;
            apiAccessToken: typeof apiAccessToken;
            apiRevokeAccessToken: typeof apiRevokeAccessToken;
            apiUpdateUserAuth: typeof apiUpdateUserAuth;
            apiGetTotalUsers: typeof apiGetTotalUsers;
        }
    }
}