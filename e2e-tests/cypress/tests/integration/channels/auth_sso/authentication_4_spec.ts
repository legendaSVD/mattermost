import * as TIMEOUTS from '../../../fixtures/timeouts';
import {reUrl, getRandomId} from '../../../utils';
describe('Authentication', () => {
    let testUser;
    before(() => {
        cy.shouldHaveEmailEnabled();
        cy.apiCreateUser().then(({user: newUser}) => {
            testUser = newUser;
        });
    });
    beforeEach(() => {
        cy.apiAdminLogin();
    });
    it('MM-T1764 - Security - Signup: Email verification required (after having created account when verification was not required)', () => {
        cy.apiUpdateConfig({
            EmailSettings: {
                RequireEmailVerification: false,
            },
        });
        cy.apiLogin(testUser);
        cy.visit('/');
        cy.url().should('include', '/select_team');
        cy.findByText('Teams you can join:', {timeout: TIMEOUTS.ONE_MIN}).should('be.visible');
        cy.apiAdminLogin();
        cy.apiUpdateConfig({
            EmailSettings: {
                RequireEmailVerification: true,
            },
        });
        cy.apiLogout();
        cy.visit('/login');
        cy.get('.login-body-card-title').click();
        cy.apiGetClientLicense().then(({isLicensed}) => {
            cy.findByPlaceholderText(isLicensed ? 'Email, Username or AD/LDAP Username' : 'Email or Username', {timeout: TIMEOUTS.ONE_MIN}).clear().type(testUser.username);
        });
        cy.findByPlaceholderText('Password').clear().type(testUser.password);
        cy.get('#saveSetting').should('not.be.disabled').click();
        cy.wait(TIMEOUTS.THREE_SEC);
        cy.findByText('Resend Email').should('be.visible').and('exist').click();
        cy.findByText('Verification email sent').should('be.visible').and('exist');
        cy.findByText('You’re almost done!').should('be.visible').and('exist');
        cy.findByText('Please verify your email address. Check your inbox for an email.').should('be.visible').and('exist');
        cy.getRecentEmail(testUser).then(({body}) => {
            const permalink = body[6].match(reUrl)[0];
            cy.visit(permalink);
            cy.get('#input_password-input').clear().type(testUser.password);
            cy.get('#saveSetting').should('not.be.disabled').click();
            cy.findByText('Teams you can join:', {timeout: TIMEOUTS.ONE_MIN}).should('be.visible');
        });
    });
    it('MM-T1770 - Default password settings', () => {
        cy.apiGetClientLicense().then(({isCloudLicensed}) => {
            const newConfig = {
                PasswordSettings: {
                    MinimumLength: null,
                    Lowercase: null,
                    Number: null,
                    Uppercase: null,
                    Symbol: null,
                },
                ServiceSettings: {},
            };
            if (!isCloudLicensed) {
                newConfig.ServiceSettings = {
                    MaximumLoginAttempts: null,
                };
            }
            cy.apiUpdateConfig(newConfig);
            cy.apiGetConfig().then(({config: {PasswordSettings}}) => {
                expect(PasswordSettings.MinimumLength).equal(8);
                expect(PasswordSettings.Lowercase).equal(false);
                expect(PasswordSettings.Number).equal(false);
                expect(PasswordSettings.Uppercase).equal(false);
                expect(PasswordSettings.Symbol).equal(false);
            });
            cy.visit('/admin_console/authentication/password');
            cy.get('.admin-console__header').should('be.visible').and('have.text', 'Password');
            cy.findByTestId('passwordMinimumLengthinput').should('be.visible').and('have.value', '8');
            cy.findByText('At least one lowercase letter').siblings().should('not.be.checked');
            cy.findByText('At least one uppercase letter').siblings().should('not.be.checked');
            cy.findByText('At least one number').siblings().should('not.be.checked');
            cy.findByText('At least one symbol (e.g. "~!@#$%^&*()")').siblings().should('not.be.checked');
            if (!isCloudLicensed) {
                cy.findByTestId('maximumLoginAttemptsinput').should('be.visible').and('have.value', '10');
            }
        });
    });
    it('MM-T1783 - Username validation shows errors for various username requirements', () => {
        cy.visit('/signup_user_complete');
        cy.get('#input_email', {timeout: TIMEOUTS.ONE_MIN}).type(`test-${getRandomId()}@example.com`);
        cy.get('#input_password-input').type('Test123456!');
        cy.get('#signup-body-card-form-check-terms-and-privacy').check();
        ['1user', 'te', 'user#1', 'user!1'].forEach((option) => {
            cy.get('#input_name').clear().type(option);
            cy.findByText('Create account').click();
            cy.get('.Input___error').scrollIntoView().should('be.visible');
            cy.findByText('Usernames have to begin with a lowercase letter and be 3-22 characters long. You can use lowercase letters, numbers, periods, dashes, and underscores.').should('be.visible');
        });
    });
    it('MM-T1752 - Enable account creation - true', () => {
        cy.apiUpdateConfig({
            TeamSettings: {
                EnableUserCreation: true,
            },
        });
        cy.apiLogout();
        cy.visit('/login');
        cy.findByText('Don\'t have an account?', {timeout: TIMEOUTS.ONE_MIN}).should('be.visible');
        cy.visit('/signup_user_complete');
        cy.get('#input_email', {timeout: TIMEOUTS.ONE_MIN}).type(`test-${getRandomId()}@example.com`);
        cy.get('#input_password-input').type('Test123456!');
        cy.get('#input_name').clear().type(`Test${getRandomId()}`);
        cy.get('#signup-body-card-form-check-terms-and-privacy').check();
        cy.findByText('Create account').click();
        cy.findByText('Teams you can join:', {timeout: TIMEOUTS.ONE_MIN}).should('be.visible');
    });
    it('MM-T1753 - Enable account creation - false', () => {
        cy.apiUpdateConfig({
            TeamSettings: {
                EnableUserCreation: false,
            },
            LdapSettings: {
                Enable: false,
            },
        });
        cy.apiLogout();
        cy.visit('/login');
        cy.findByText('Don\'t have an account?', {timeout: TIMEOUTS.ONE_MIN}).should('be.visible').click();
        cy.url().should('include', '/access_problem');
        cy.findByText('Contact your workspace admin');
        cy.visit('/signup_user_complete');
        cy.findByText('This server doesn’t have any sign-in methods enabled').should('be.visible').and('exist');
    });
    it('MM-T1754 - Restrict Domains - Account creation link on signin page', () => {
        cy.apiUpdateConfig({
            TeamSettings: {
                RestrictCreationToDomains: 'test.com',
                EnableUserCreation: true,
            },
        });
        cy.apiLogout();
        cy.visit('/login');
        cy.findByText('Don\'t have an account?', {timeout: TIMEOUTS.ONE_MIN}).should('be.visible');
        cy.visit('/signup_user_complete');
        cy.get('#input_email', {timeout: TIMEOUTS.ONE_MIN}).type(`test-${getRandomId()}@example.com`);
        cy.get('#input_password-input').type('Test123456!');
        cy.get('#input_name').clear().type(`Test${getRandomId()}`);
        cy.get('#signup-body-card-form-check-terms-and-privacy').check();
        cy.findByText('Create account').click();
        cy.get('.AlertBanner__title').scrollIntoView().should('be.visible');
        cy.findByText('The email you provided does not belong to an accepted domain. Please contact your administrator or sign up with a different email.').should('be.visible').and('exist');
    });
    it('MM-T1755 - Restrict Domains - Email invite', () => {
        cy.apiUpdateConfig({
            TeamSettings: {
                RestrictCreationToDomains: 'test.com',
                EnableUserCreation: true,
            },
        });
        cy.visit('/');
        cy.postMessage('hello');
        cy.uiOpenTeamMenu('Invite people');
        cy.findByText('Copy invite link').click();
        cy.findByLabelText('Invite People').type(`test-${getRandomId()}@mattermost.com{downarrow}{downarrow}{enter}`, {force: true});
        cy.findByRole('button', {name: 'Invite'}).click({force: true});
        cy.contains('The following email addresses do not belong to an accepted domain:', {timeout: TIMEOUTS.ONE_MIN}).should('be.visible').and('exist');
    });
});