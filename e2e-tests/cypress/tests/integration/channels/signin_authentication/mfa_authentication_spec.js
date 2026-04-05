import authenticator from 'authenticator';
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
        cy.apiAdminLogin({failOnStatusCode: false});
    });
    it('MM-T404 Set up Multi-factor Authentication (Email login) - Enabled but not enforced', () => {
        cy.apiUpdateConfig({
            ServiceSettings: {
                EnableMultifactorAuthentication: true,
            },
        });
        cy.apiLogin(testUser);
        cy.visit(`/${testTeam.name}/channels/town-square`).wait(timeouts.ONE_SEC);
        cy.uiOpenProfileModal('Security');
        cy.get('#mfaEdit').should('be.visible').click();
        cy.findByText('Add MFA to Account').should('be.visible').click();
        cy.uiGetMFASecret(testUser.id).then((secret) => {
            cy.apiLogout();
            cy.visit('/login');
            fillCredentialsForUser(testUser);
            fillMFACode('123456');
            cy.findByText('Invalid MFA token.').should('be.visible');
            fillCredentialsForUser(testUser);
            const token = authenticator.generateToken(secret);
            fillMFACode(token);
            cy.url().should('include', 'town-square');
        });
    });
    it('MM-T405 MFA - Remove', () => {
        cy.apiUpdateConfig({
            ServiceSettings: {
                EnableMultifactorAuthentication: true,
            },
        });
        cy.apiGenerateMfaSecret(testUser.id).then((res) => {
            let token = authenticator.generateToken(res.code.secret);
            cy.apiActivateUserMFA(testUser.id, true, token);
            cy.apiLogout();
            cy.visit('/login');
            fillCredentialsForUser(testUser);
            token = authenticator.generateToken(res.code.secret);
            fillMFACode(token);
            cy.uiOpenProfileModal('Security');
            cy.get('#mfaEdit').should('be.visible').click();
            cy.findByText('Remove MFA from Account').should('be.visible').click();
            cy.apiLogout();
            cy.visit('/login');
            fillCredentialsForUser(testUser);
            cy.url().should('include', 'town-square');
        });
    });
});
function fillMFACode(code) {
    cy.wait(timeouts.TWO_SEC);
    cy.get('.content-layout-column').should('be.visible').click();
    cy.findByPlaceholderText('MFA Token').clear().type(code).wait(timeouts.ONE_SEC);
    cy.findByRole('button', {name: 'Submit'}).click();
}