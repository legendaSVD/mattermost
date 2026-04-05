import * as TIMEOUTS from '../../../fixtures/timeouts';
import {getRandomId} from '../../../utils';
describe('Authentication', () => {
    beforeEach(() => {
        cy.apiAdminLogin();
    });
    it('MM-T1771 - Minimum password length error field shows below 5 and above 72', () => {
        cy.visit('/admin_console/authentication/password');
        cy.findByPlaceholderText('E.g.: "5"', {timeout: TIMEOUTS.ONE_MIN}).clear().type('88');
        cy.uiSave();
        cy.findByText('Minimum password length must be a whole number greater than or equal to 5 and less than or equal to 72.', {timeout: TIMEOUTS.ONE_MIN}).
            should('exist').
            and('be.visible');
        cy.findByPlaceholderText('E.g.: "5"').clear().type('3');
        cy.uiSave();
        cy.findByText('Minimum password length must be a whole number greater than or equal to 5 and less than or equal to 72.', {timeout: TIMEOUTS.ONE_MIN}).
            should('exist').
            and('be.visible');
    });
    it('MM-T1772 - Change minimum password length, verify help text and error message', () => {
        cy.visit('/admin_console/authentication/password');
        cy.findByPlaceholderText('E.g.: "5"', {timeout: TIMEOUTS.ONE_MIN}).clear().type('7');
        cy.uiSave();
        cy.findByText('Your password must be 7-72 characters long.').should('be.visible');
        cy.apiLogout();
        cy.visit('/signup_user_complete');
        cy.get('#input_email', {timeout: TIMEOUTS.ONE_MIN}).type(`test-${getRandomId()}@example.com`);
        cy.get('#input_name').clear().type(`BestUsername${getRandomId()}`);
        cy.get('#input_password-input').clear().type('less');
        cy.get('#signup-body-card-form-check-terms-and-privacy').check();
        cy.findByText('Create account').click();
        cy.findByText('Your password must be 7-72 characters long.').should('be.visible');
        cy.get('#input_password-input').clear().type('greaterthan7');
        cy.get('#signup-body-card-form-check-terms-and-privacy').check();
        cy.findByText('Create account').click();
        cy.findByText('Teams you can join:', {timeout: TIMEOUTS.ONE_MIN}).should('be.visible');
    });
    it('MM-T1773 - Minimum password length field resets to default after saving invalid value', () => {
        cy.visit('/admin_console/authentication/password');
        cy.findByPlaceholderText('E.g.: "5"', {timeout: TIMEOUTS.ONE_MIN}).clear().type('10');
        cy.uiSave();
        cy.reload();
        cy.findByPlaceholderText('E.g.: "5"').invoke('val').should('equal', '10');
        cy.findByPlaceholderText('E.g.: "5"').clear();
        cy.uiSave();
        cy.findByPlaceholderText('E.g.: "5"').invoke('val').should('equal', '5');
    });
    it('MM-T1774 - Select all Password Requirements, verify help text and error on bad password', () => {
        cy.apiUpdateConfig({
            PasswordSettings: {
                Lowercase: true,
                Number: true,
                Uppercase: true,
                Symbol: true,
            },
        });
        cy.apiLogout();
        cy.visit('/signup_user_complete');
        cy.get('#input_email', {timeout: TIMEOUTS.ONE_MIN}).type(`test-${getRandomId()}@example.com`);
        cy.get('#input_name').clear().type(`BestUsernameInTheWorld${getRandomId()}`);
        cy.get('#signup-body-card-form-check-terms-and-privacy').check();
        ['NOLOWERCASE123!', 'noupppercase123!', 'NoNumber!', 'NoSymbol123'].forEach((option) => {
            cy.get('#input_password-input').clear().type(option);
            cy.findByText('Create account').click();
            cy.findByText('Your password must be 5-72 characters long and include both lowercase and uppercase letters, numbers, and special characters.').should('be.visible');
        });
    });
    it('MM-T1777 - Multi-factor Authentication option hidden in Profile when disabled', () => {
        cy.apiUpdateConfig({
            ServiceSettings: {
                EnableMultifactorAuthentication: false,
            },
        });
        cy.visit('/');
        cy.uiOpenProfileModal('Security');
        cy.findByText('Multi-factor Authentication').should('not.exist');
    });
    it('MM-T1779 - Multi-factor Authentication option appears in Profile when enabled', () => {
        cy.apiUpdateConfig({
            ServiceSettings: {
                EnableMultifactorAuthentication: true,
            },
        });
        cy.visit('/');
        cy.uiOpenProfileModal('Security');
        cy.findByText('Multi-factor Authentication').should('be.visible');
    });
    it('MM-T1780 - Multi-factor Authentication false: User can log in without being prompted for MFA', () => {
        cy.apiUpdateConfig({
            ServiceSettings: {
                EnableMultifactorAuthentication: true,
                EnforceMultifactorAuthentication: false,
            },
        });
        cy.apiCreateUser().then(({user: newUser}) => {
            cy.apiLogout();
            cy.apiLogin(newUser);
            cy.visit('/');
            cy.findByText('Teams you can join:', {timeout: TIMEOUTS.ONE_MIN}).should('be.visible');
        });
    });
});