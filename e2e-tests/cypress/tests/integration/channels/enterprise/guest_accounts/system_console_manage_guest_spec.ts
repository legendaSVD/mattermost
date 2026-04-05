import * as TIMEOUTS from '../../../../fixtures/timeouts';
import {getRandomId} from '../../../../utils';
import {getAdminAccount} from '../../../../support/env';
describe('Guest Account - Verify Manage Guest Users', () => {
    const admin = getAdminAccount();
    let guestUser: Cypress.UserProfile;
    let testTeam: Cypress.Team;
    let testChannel: Cypress.Channel;
    before(() => {
        cy.apiRequireLicenseForFeature('GuestAccounts');
        cy.apiUpdateConfig({
            GuestAccountsSettings: {
                Enable: true,
            },
        });
        cy.apiInitSetup().then(({team, channel}) => {
            testTeam = team;
            testChannel = channel;
            cy.apiCreateGuestUser({}).then(({guest}) => {
                guestUser = guest;
                cy.apiAddUserToTeam(testTeam.id, guestUser.id).then(() => {
                    cy.apiAddUserToChannel(testChannel.id, guestUser.id);
                });
            });
        });
        cy.visit('/admin_console/user_management/users');
    });
    beforeEach(() => {
        cy.reload();
        cy.findByPlaceholderText('Search users').should('be.visible').type(guestUser.username).wait(TIMEOUTS.TWO_SEC);
    });
    it('MM-T1391 Verify the manage options displayed for Guest User', () => {
        cy.get('#systemUsersTable-cell-0_actionsColumn').should('have.text', 'Guest').click();
        const includeOptions = ['Deactivate', 'Manage roles', 'Manage teams', 'Reset password', 'Update email', 'Promote to member', 'Revoke sessions'];
        includeOptions.forEach((includeOption) => {
            cy.findByText(includeOption).should('be.visible');
        });
        const missingOptions = ['Demote to Guest'];
        missingOptions.forEach((missingOption) => {
            cy.findByText(missingOption).should('not.exist');
        });
    });
    it('MM-18048 Change Email of a Guest User and Verify', () => {
        cy.get('#systemUsersTable-cell-0_actionsColumn').should('have.text', 'Guest').click();
        cy.findByText('Update email').click();
        const email = `temp-${getRandomId()}@mattermost.com`;
        cy.get('#resetEmailModal').should('be.visible').within(() => {
            cy.get('input[type="email"]').type(email);
            cy.get('button.btn-primary.confirm').click();
        });
        cy.findByText(email).should('be.visible');
        cy.reload();
        cy.findByPlaceholderText('Search users').should('be.visible').type(guestUser.username);
        cy.findByText(email).should('be.visible');
    });
    it('MM-18048 Revoke Session of a Guest User and Verify', () => {
        cy.get('#systemUsersTable-cell-0_actionsColumn').should('have.text', 'Guest').click();
        cy.findByText('Revoke sessions').click();
        cy.get('#confirmModal').should('be.visible').within(() => {
            cy.get('#genericModalLabel').should('be.visible').and('have.text', `Revoke Sessions for ${guestUser.username}`);
            cy.get('.modal-body .ConfirmModal__body').should('be.visible').and('have.text', `This action revokes all sessions for ${guestUser.username}. They will be logged out from all devices. Are you sure you want to revoke all sessions for ${guestUser.username}?`);
        });
        cy.get('#cancelModalButton').click();
        cy.get('#confirmModal').should('not.exist');
        cy.apiLogout();
        cy.apiLogin(guestUser);
        cy.visit(`/${testTeam.name}/channels/${testChannel.name}`);
        cy.get(`#sidebarItem_${testChannel.name}`).click({force: true});
        cy.externalRequest({user: admin, method: 'post', path: `users/${guestUser.id}/sessions/revoke/all`}).then(() => {
            cy.visit(`/${testTeam.name}/channels/${testChannel.name}`);
            cy.url({timeout: TIMEOUTS.HALF_MIN}).should('include', '/login');
            cy.get('.login-body-card', {timeout: TIMEOUTS.HALF_MIN}).should('be.visible');
        });
    });
});