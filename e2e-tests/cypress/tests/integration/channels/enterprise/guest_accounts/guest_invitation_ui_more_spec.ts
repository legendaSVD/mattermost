import {getRandomId} from '../../../../utils';
import * as TIMEOUTS from '../../../../fixtures/timeouts';
import {
    changeGuestFeatureSettings,
    invitePeople,
    verifyInvitationError,
    verifyInvitationSuccess,
} from './helpers';
describe('Guest Account - Guest User Invitation Flow', () => {
    let testTeam: Cypress.Team;
    before(() => {
        cy.apiRequireLicenseForFeature('GuestAccounts');
    });
    beforeEach(() => {
        cy.apiAdminLogin();
        changeGuestFeatureSettings();
        cy.apiInitSetup().then(({team}) => {
            testTeam = team;
            cy.visit(`/${team.name}/channels/town-square`);
        });
    });
    it('MM-T1336 Invite Guests - Existing Team Member', () => {
        cy.apiCreateUser().then(({user: newUser}) => {
            cy.apiAddUserToTeam(testTeam.id, newUser.id).then(() => {
                invitePeople(newUser.username, 1, newUser.username);
                verifyInvitationError(newUser.username, testTeam, 'This person is already a member of the workspace. Invite them as a member instead of a guest.');
            });
        });
    });
    it('MM-T1337 Invite Guests - Existing Team Guest', () => {
        cy.apiCreateGuestUser({}).then(({guest}) => {
            cy.apiAddUserToTeam(testTeam.id, guest.id).then(() => {
                invitePeople(guest.first_name, 1, guest.username, 'Off-Topic');
                verifyInvitationSuccess(guest.username, testTeam, 'This guest has been added to the team and channel.');
                invitePeople(guest.last_name, 1, guest.username, 'Off-Topic');
                verifyInvitationError(guest.username, testTeam, 'This person is already a member of all the channels.', true);
            });
        });
    });
    it('MM-T1338 Invite Guests - Existing Member not on the team', () => {
        cy.apiCreateUser().then(({user: regularUser}) => {
            invitePeople(regularUser.email, 1, regularUser.username);
            verifyInvitationError(regularUser.username, testTeam, 'This person is already a member of the workspace. Invite them as a member instead of a guest.');
        });
    });
    it('MM-T1339 Invite Guests - Existing Guest not on the team', () => {
        cy.apiCreateGuestUser({}).then(({guest}) => {
            invitePeople(guest.email, 1, guest.username);
            verifyInvitationSuccess(guest.username, testTeam, 'This guest has been added to the team and channel.', true);
        });
    });
    it('MM-T1340 Invite Guests - New User not in the system', () => {
        const email = `temp-${getRandomId()}@mattermost.com`;
        invitePeople(email, 1, email);
        verifyInvitationSuccess(email, testTeam, 'An invitation email has been sent.');
    });
    it('MM-T1394 Change Email not whitelisted for Guest user', () => {
        changeGuestFeatureSettings(true, true, 'example.com');
        cy.reload();
        cy.visit(`/${testTeam.name}/channels/town-square`);
        const email = `temp-${getRandomId()}@mattermost.com`;
        invitePeople(email, 1, email);
        const expectedError = `The following email addresses do not belong to an accepted domain: ${email}. Please contact your System Administrator for details.`;
        verifyInvitationError(email, testTeam, expectedError);
        cy.apiCreateGuestUser({}).then(({guest}) => {
            cy.visit('/admin_console/user_management/users');
            cy.findByPlaceholderText('Search users').should('be.visible').type(guest.username).wait(TIMEOUTS.ONE_SEC);
            cy.get('#systemUsersTable-cell-0_actionsColumn').click();
            cy.findByText('Update email').should('be.visible').click();
            cy.get('#resetEmailModal').should('be.visible').within(() => {
                cy.get('input[type="email"]').type(email);
                cy.get('button.btn-primary.confirm').click();
                cy.get('.error').should('be.visible').and('have.text', 'The email you provided does not belong to an accepted domain for guest accounts. Please contact your administrator or sign up with a different email.');
                cy.get('.close').click();
            });
        });
    });
});