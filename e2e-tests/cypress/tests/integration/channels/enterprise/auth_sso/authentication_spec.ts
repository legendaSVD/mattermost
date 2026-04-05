import {Team} from '@mattermost/types/teams';
import * as TIMEOUTS from '../../../../fixtures/timeouts';
import {getRandomId} from '../../../../utils';
describe('Authentication', () => {
    const restrictCreationToDomains = 'mattermost.com, test.com';
    let testTeam: Team;
    before(() => {
        cy.apiRequireLicense();
        cy.apiInitSetup().then(({team}) => {
            testTeam = team;
        });
    });
    beforeEach(() => {
        cy.apiAdminLogin();
    });
    it('MM-T1759 - Restrict Domains - Team invite open team', () => {
        cy.apiUpdateConfig({
            TeamSettings: {
                RestrictCreationToDomains: restrictCreationToDomains,
            },
        });
        cy.visit(`/admin_console/user_management/teams/${testTeam.id}`);
        cy.findByTestId('allowAllToggleSwitch', {timeout: TIMEOUTS.ONE_MIN}).click();
        cy.findByText('Save').scrollIntoView().click();
        cy.findByText('Mattermost Teams', {timeout: TIMEOUTS.ONE_MIN}).should('be.visible');
        cy.apiLogout().visit(`/signup_user_complete/?id=${testTeam.invite_id}`);
        cy.get('#input_email', {timeout: TIMEOUTS.ONE_MIN}).type(`test-${getRandomId()}@example.com`);
        cy.get('#input_password-input').type('Test123456!');
        cy.get('#input_name').clear().type(`Test${getRandomId()}`);
        cy.get('#signup-body-card-form-check-terms-and-privacy').check();
        cy.findByText('Create account').click();
        cy.get('.AlertBanner__title').scrollIntoView().should('be.visible');
        cy.findByText('The email you provided does not belong to an accepted domain. Please contact your administrator or sign up with a different email.').should('be.visible').and('exist');
    });
    it('MM-T1761 - Enable Open Server - Create link appears if email account creation is false and other signin methods are true', () => {
        cy.apiUpdateConfig({
            EmailSettings: {
                EnableSignUpWithEmail: false,
            },
            LdapSettings: {
                Enable: true,
            },
        });
        cy.apiLogout().visit('/');
        cy.findByText('Don\'t have an account?', {timeout: TIMEOUTS.ONE_MIN}).should('be.visible');
    });
    it('MM-T1766 - Authentication - Email - Creation with email = true', () => {
        cy.apiUpdateConfig({
            EmailSettings: {
                EnableSignUpWithEmail: true,
            },
            TeamSettings: {
                RestrictCreationToDomains: restrictCreationToDomains,
            },
        });
        cy.apiLogout().visit(`/signup_user_complete/?id=${testTeam.invite_id}`);
        cy.findByText('Email address').should('exist').and('be.visible');
        cy.findByPlaceholderText('Choose a Password').should('exist').and('be.visible');
    });
});