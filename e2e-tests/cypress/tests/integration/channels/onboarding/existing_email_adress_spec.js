import * as TIMEOUTS from '../../../fixtures/timeouts';
import {getRandomId} from '../../../utils';
const uniqueUserId = getRandomId();
function signupWithEmail(name, pw) {
    cy.visit('/login');
    cy.findByText('Don\'t have an account?', {timeout: TIMEOUTS.HALF_MIN}).should('be.visible').click();
    cy.get('#input_email').type('unique.' + uniqueUserId + '@sample.mattermost.com');
    cy.get('#input_name').type(name);
    cy.get('#input_password-input').type(pw);
    cy.get('#signup-body-card-form-check-terms-and-privacy').check();
    cy.findByText('Create account').click();
}
describe('Cloud Onboarding', () => {
    before(() => {
        const newSettings = {
            Office365Settings: {Enable: false},
            LdapSettings: {Enable: false},
        };
        cy.apiUpdateConfig(newSettings);
        cy.apiLogout();
    });
    it('MM-T403 Email address already exists', () => {
        signupWithEmail('unique.' + uniqueUserId, 'unique1pw');
        cy.contains('Logout').should('be.visible');
        cy.get('#teamsYouCanJoinContent').should('be.visible');
        cy.get('#createNewTeamLink').should('have.attr', 'href', '/create_team').and('be.visible', 'contain', 'Create a team');
        cy.apiLogout();
        signupWithEmail('unique-2', 'unique2pw');
        cy.findByText('An account with that email already exists.').should('be.visible');
    });
});