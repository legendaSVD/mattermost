import timeouts from '../../../fixtures/timeouts';
import {fillCredentialsForUser} from './helpers';
describe('Authentication', () => {
    let testTeam;
    let testTeam2;
    let testUser;
    let testUser2;
    before(() => {
        cy.apiInitSetup().then(({team, user}) => {
            testTeam = team;
            testUser = user;
        });
        cy.apiCreateUser().then(({user: user2}) => {
            testUser2 = user2;
            cy.apiAddUserToTeam(testTeam.id, testUser2.id);
        });
        cy.apiCreateTeam().then(({team}) => {
            testTeam2 = team;
            cy.apiAddUserToTeam(testTeam2.id, testUser.id);
            cy.apiAddUserToTeam(testTeam2.id, testUser2.id);
        });
    });
    beforeEach(() => {
        cy.apiLogout();
    });
    it('MM-T406 Sign In Forgot password - Email address not on server (but valid) Focus in login field on login page', () => {
        cy.visit('/login').wait(timeouts.FIVE_SEC);
        cy.focused().should('have.id', 'input_loginId');
        cy.findByText('Forgot your password?').should('be.visible').click();
        cy.url().should('contain', '/reset_password');
        cy.get('#passwordResetEmailInput').type('test@test.com');
        cy.findByText('Reset my password').should('be.visible').click();
        cy.get('#passwordResetEmailSent').should('be.visible').within(() => {
            cy.get('span').first().should('have.text', 'If the account exists, a password reset email will be sent to:');
            cy.get('div b').first().should('have.text', 'test@test.com');
            cy.get('span').last().should('have.text', 'Please check your inbox.');
        });
        cy.getRecentEmail(testUser).then(({subject}) => {
            expect(subject).not.contain('Reset your password');
        });
    });
    it('MM-T409 Logging out clears currently logged in user from the store', () => {
        cy.visit('/login');
        fillCredentialsForUser(testUser);
        cy.visit(`/${testTeam.name}/channels/off-topic`).wait(timeouts.ONE_SEC);
        cy.uiLogout();
        cy.visit('/login');
        fillCredentialsForUser(testUser2);
        cy.visit(`/${testTeam2.name}/channels/town-square`).wait(timeouts.ONE_SEC);
        cy.uiLogout();
        cy.visit('/login');
        fillCredentialsForUser(testUser);
        cy.url().should('include', `/${testTeam.name}/channels/off-topic`);
        cy.uiLogout();
        cy.visit('/login');
        fillCredentialsForUser(testUser2);
        cy.url().should('include', `/${testTeam2.name}/channels/town-square`);
    });
});