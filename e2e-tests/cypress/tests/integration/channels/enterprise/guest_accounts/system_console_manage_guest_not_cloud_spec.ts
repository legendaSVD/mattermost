import * as TIMEOUTS from '../../../../fixtures/timeouts';
import {verifyGuest} from './helpers';
describe('Guest Account - Verify Manage Guest Users', () => {
    let guestUser: Cypress.UserProfile;
    let testTeam: Cypress.Team;
    let testChannel: Cypress.Channel;
    before(() => {
        cy.shouldNotRunOnCloudEdition();
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
        cy.get('#input_searchTerm', {timeout: TIMEOUTS.HALF_MIN}).should('be.visible').type(guestUser.username).wait(TIMEOUTS.TWO_SEC);
    });
    it('MM-18048 Deactivate Guest User and Verify', () => {
        cy.get('#actionMenuButton-systemUsersTable-0').click();
        cy.wait(TIMEOUTS.HALF_SEC).findByText('Deactivate').click();
        cy.get('#confirmModal').should('be.visible').within(() => {
            cy.get('#genericModalLabel').should('be.visible').and('have.text', `Deactivate ${guestUser.username}`);
            cy.get('.modal-body .ConfirmModal__body').should('be.visible').and('have.text', `This action deactivates ${guestUser.username}. They will be logged out and not have access to any teams or channels on this system.\nAre you sure you want to deactivate ${guestUser.username}?`);
        });
        cy.get('#cancelModalButton').click();
        cy.get('#confirmModal').should('not.exist');
        verifyGuest();
        cy.get('#actionMenuButton-systemUsersTable-0').click();
        cy.wait(TIMEOUTS.HALF_SEC).findByText('Deactivate').click();
        cy.get('#confirmModalButton').click();
        cy.get('#confirmModal').should('not.exist');
        verifyGuest('Deactivated');
        cy.reload();
        cy.get('#input_searchTerm').should('be.visible').type(guestUser.username);
        verifyGuest('Deactivated');
    });
    it('MM-18048 Activate Guest User and Verify', () => {
        cy.get('#actionMenuButton-systemUsersTable-0').click();
        cy.wait(TIMEOUTS.HALF_SEC).findByText('Activate').click();
        verifyGuest();
        cy.reload();
        cy.get('#input_searchTerm').should('be.visible').type(guestUser.username);
        verifyGuest();
    });
});