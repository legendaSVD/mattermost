import {UserProfile} from '@mattermost/types/users';
import * as authenticator from 'authenticator';
import * as TIMEOUTS from '../../../../fixtures/timeouts';
describe('Authentication', () => {
    let mfaSysAdmin: UserProfile;
    let testUser: UserProfile;
    let adminMFASecret: string;
    before(() => {
        cy.apiRequireLicenseForFeature('MFA');
        cy.shouldHaveEmailEnabled();
        cy.apiInitSetup().then(({user}) => {
            testUser = user;
        });
        cy.apiCreateCustomAdmin().then(({sysadmin}) => {
            mfaSysAdmin = sysadmin;
        });
    });
    it('MM-T1778 - MFA - Enforced', () => {
        cy.apiLogin(mfaSysAdmin);
        cy.visit('/admin_console/authentication/mfa');
        cy.findByText('Multi-factor Authentication', {timeout: TIMEOUTS.ONE_MIN}).should('be.visible').and('exist');
        cy.findByTestId('ServiceSettings.EnableMultifactorAuthenticationtrue').check();
        cy.findByTestId('ServiceSettings.EnforceMultifactorAuthenticationtrue').check();
        cy.findByText('Save').click().wait(TIMEOUTS.ONE_SEC);
        cy.uiGetMFASecret(mfaSysAdmin.id).then((secret) => {
            adminMFASecret = secret;
            cy.visit('/admin_console/user_management/users');
            cy.findByPlaceholderText('Search users').type(testUser.username).wait(TIMEOUTS.HALF_SEC);
            cy.get('#systemUsersTable-cell-0_actionsColumn').click().wait(TIMEOUTS.HALF_SEC);
            cy.findByText('Remove MFA').should('not.exist');
            cy.apiLogout();
        });
        cy.uiLogin(testUser);
        cy.wait(TIMEOUTS.THREE_SEC);
        cy.findByText('Multi-factor Authentication Setup', {timeout: TIMEOUTS.ONE_MIN}).should('be.visible').and('exist');
    });
    it('MM-T1781 - MFA - Admin removes another users MFA', () => {
        cy.apiLogin(testUser);
        cy.wait(TIMEOUTS.THREE_SEC);
        cy.get('#mfa').wait(TIMEOUTS.HALF_SEC).find('.col-sm-12').then((p) => {
            const secretp = p.text();
            const testUserMFASecret = secretp.split(' ')[1];
            const token = authenticator.generateToken(testUserMFASecret);
            cy.findByPlaceholderText('MFA Code').type(token);
            cy.findByText('Save').click();
            cy.wait(TIMEOUTS.HALF_SEC);
            cy.findByText('Okay').click();
            cy.apiLogout();
        });
        cy.wait(TIMEOUTS.THREE_SEC);
        const adminMFAToken = authenticator.generateToken(adminMFASecret);
        cy.apiLoginWithMFA(mfaSysAdmin, adminMFAToken);
        cy.visit('/admin_console/user_management/users');
        cy.findByPlaceholderText('Search users').type(testUser.username).wait(TIMEOUTS.HALF_SEC);
        cy.get('#systemUsersTable-cell-0_actionsColumn').click().wait(TIMEOUTS.HALF_SEC);
        cy.findByText('Remove MFA').should('be.visible').click();
        cy.visit('/admin_console/authentication/mfa');
        cy.findByText('Multi-factor Authentication', {timeout: TIMEOUTS.ONE_MIN}).should('be.visible').and('exist');
        cy.findByTestId('ServiceSettings.EnforceMultifactorAuthenticationfalse').check();
        cy.findByText('Save').click().wait(TIMEOUTS.ONE_SEC);
        cy.apiLogout();
        cy.apiLogin(testUser);
        cy.visit('/');
        cy.findByText('Multi-factor Authentication Setup', {timeout: TIMEOUTS.ONE_MIN}).should('not.exist').and('not.exist');
    });
    it('MM-T1782 - MFA - Removing MFA option hidden for users without MFA set up', () => {
        const token = authenticator.generateToken(adminMFASecret);
        cy.apiLoginWithMFA(mfaSysAdmin, token);
        cy.visit('/admin_console/user_management/users');
        cy.findByPlaceholderText('Search users').type(testUser.username).wait(TIMEOUTS.HALF_SEC);
        cy.wait(TIMEOUTS.HALF_SEC);
        cy.get('#systemUsersTable-cell-0_actionsColumn').click().wait(TIMEOUTS.HALF_SEC);
        cy.findByText('Remove MFA').should('not.exist');
        cy.apiUpdateConfig({
            ServiceSettings: {
                EnableMultifactorAuthentication: false,
                EnforceMultifactorAuthentication: false,
            },
        });
    });
});