import * as TIMEOUTS from '../../../fixtures/timeouts';
import {getRandomId} from '../../../utils';
describe('Authentication', () => {
    const restrictCreationToDomains = 'mattermost.com, test.com';
    let testUser;
    let testUserAlreadyInTeam;
    let testTeam;
    before(() => {
        cy.shouldHaveEmailEnabled();
        cy.apiInitSetup().then(({user, team}) => {
            testUserAlreadyInTeam = user;
            testTeam = team;
            cy.apiCreateUser().then(({user: newUser}) => {
                testUser = newUser;
            });
        });
    });
    beforeEach(() => {
        cy.apiAdminLogin();
    });
    it('MM-T1756 - Restrict Domains - Multiple - success', () => {
        cy.apiUpdateConfig({
            TeamSettings: {
                RestrictCreationToDomains: restrictCreationToDomains,
            },
        });
        cy.apiLogout();
        cy.visit('/login');
        cy.findByText('Don\'t have an account?', {timeout: TIMEOUTS.ONE_MIN}).should('be.visible');
        cy.visit('/signup_user_complete');
        cy.get('#input_email', {timeout: TIMEOUTS.ONE_MIN}).type(`test-${getRandomId()}@mattermost.com`);
        cy.get('#input_password-input').type('Test123456!');
        cy.get('#input_name').clear().type(`test${getRandomId()}`);
        cy.get('#signup-body-card-form-check-terms-and-privacy').check();
        cy.findByText('Create account').click();
        cy.findByText('Teams you can join:', {timeout: TIMEOUTS.ONE_MIN}).should('be.visible');
    });
    it('MM-T1757 - Restrict Domains - Multiple - fail', () => {
        cy.apiUpdateConfig({
            TeamSettings: {
                RestrictCreationToDomains: restrictCreationToDomains,
            },
        });
        cy.apiLogin(testUserAlreadyInTeam);
        cy.visit('/');
        cy.uiOpenProfileModal('Profile Settings');
        cy.get('#emailEdit').should('be.visible').click();
        cy.get('#primaryEmail').should('be.visible').type('user-123123@example.com');
        cy.get('#confirmEmail').should('be.visible').type('user-123123@example.com');
        cy.get('#currentPassword').should('be.visible').type(testUser.password);
        cy.uiSave().wait(TIMEOUTS.HALF_SEC);
        cy.findByText('The email you provided does not belong to an accepted domain. Please contact your administrator or sign up with a different email.').should('be.visible');
    });
    it('MM-T1758 - Restrict Domains - Team invite closed team', () => {
        cy.apiUpdateConfig({
            TeamSettings: {
                RestrictCreationToDomains: restrictCreationToDomains,
            },
        });
        cy.apiLogout();
        cy.visit(`/signup_user_complete/?id=${testTeam.invite_id}`);
        cy.get('#input_email', {timeout: TIMEOUTS.ONE_MIN}).type(`test-${getRandomId()}@example.com`);
        cy.get('#input_password-input').type('Test123456!');
        cy.get('#input_name').clear().type(`test${getRandomId()}`);
        cy.get('#signup-body-card-form-check-terms-and-privacy').check();
        cy.findByText('Create account').click();
        cy.get('.AlertBanner__title').scrollIntoView().should('be.visible');
        cy.findByText('The email you provided does not belong to an accepted domain. Please contact your administrator or sign up with a different email.').should('be.visible');
    });
    it('MM-T1763 - Security - Signup: Email verification not required, user immediately sees Town Square', () => {
        cy.apiUpdateConfig({
            EmailSettings: {
                RequireEmailVerification: false,
            },
        }).then(({config}) => {
            cy.apiLogout();
            cy.visit('/login');
            cy.findByText('Don\'t have an account?', {timeout: TIMEOUTS.ONE_MIN}).should('be.visible');
            cy.visit('/signup_user_complete');
            const username = `Test${getRandomId()}`;
            const email = `${username.toLowerCase()}@example.com`;
            cy.get('#input_email', {timeout: TIMEOUTS.ONE_MIN}).type(email);
            cy.get('#input_password-input').type('Test123456!');
            cy.get('#input_name').clear().type(username);
            cy.get('#signup-body-card-form-check-terms-and-privacy').check();
            cy.findByText('Create account').click();
            cy.findByText('Teams you can join:', {timeout: TIMEOUTS.ONE_MIN}).should('be.visible');
            cy.getRecentEmail({username, email}).then(({subject}) => {
                expect(subject).to.include(`[${config.TeamSettings.SiteName}] You joined`);
            });
        });
    });
    it('MM-T1765 - Authentication - Email - Creation with email = false', () => {
        cy.apiUpdateConfig({
            EmailSettings: {
                EnableSignUpWithEmail: false,
            },
            GitLabSettings: {
                Enable: true,
            },
        });
        cy.apiLogout();
        cy.visit(`/signup_user_complete/?id=${testTeam.invite_id}`);
        cy.findByText('Create your account with one of the following:').should('exist');
        cy.findByText('GitLab', {timeout: TIMEOUTS.ONE_MIN}).should('be.visible');
        cy.findByText('Email address').should('not.exist');
        cy.findByText('Choose a Password').should('not.exist');
    });
});