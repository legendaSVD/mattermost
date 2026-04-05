import {Team} from '@mattermost/types/teams';
import {UserProfile} from '@mattermost/types/users';
describe('Deactivated user', () => {
    let testUser: UserProfile;
    let adminUser: UserProfile;
    let testTeam: Team;
    let personalAccessToken: string;
    before(() => {
        cy.apiInitSetup({loginAfter: true, promoteNewUserAsAdmin: true}).then(({user, team}) => {
            adminUser = user;
            testTeam = team;
            cy.apiUpdateConfig({
                ServiceSettings: {
                    EnableUserAccessTokens: true,
                },
                TeamSettings: {
                    EnableUserDeactivation: true,
                },
            });
        });
    });
    it('should not allow API access with PAT after user deactivation', () => {
        cy.apiLogin(adminUser);
        cy.apiCreateUser().then(({user}) => {
            testUser = user;
            cy.apiAddUserToTeam(testTeam.id, user.id);
            cy.apiPatchUserRoles(testUser.id, ['system_user', 'system_user_access_token']);
            cy.apiLogout();
            cy.apiLogin(testUser);
            cy.visit('/');
            const tokenName = 'token' + Date.now();
            cy.apiAccessToken(testUser.id, tokenName).then((token) => {
                personalAccessToken = token.token;
                cy.setCookie('MMAUTHTOKEN', personalAccessToken);
                cy.visit('/');
                cy.getCookie('MMAUTHTOKEN').
                    should('have.property', 'value', personalAccessToken);
                cy.get('#sidebarItem_town-square').should('be.visible');
                cy.request({
                    headers: {
                        Authorization: `Bearer ${personalAccessToken}`,
                    },
                    url: '/api/v4/users/me',
                    method: 'GET',
                }).then((response) => {
                    expect(response.status).to.equal(200);
                    expect(response.body.id).to.equal(testUser.id);
                });
                cy.makeClient({user: adminUser}).then((client) => {
                    client.updateUserActive(testUser.id, false).then(() => {
                        cy.request({
                            headers: {
                                Authorization: `Bearer ${personalAccessToken}`,
                            },
                            url: '/api/v4/users/me',
                            method: 'GET',
                            failOnStatusCode: false,
                        }).then((response) => {
                            expect(response.status).to.equal(401);
                        });
                        cy.visit(`/${testTeam.name}/channels/town-square`);
                        cy.url().should('include', '/login');
                    });
                });
            });
        });
    });
});