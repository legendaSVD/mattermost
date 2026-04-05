import * as TIMEOUTS from '../../../../fixtures/timeouts';
describe('Guest Account - Verify Guest Access UI', () => {
    beforeEach(() => {
        cy.apiRequireLicenseForFeature('GuestAccounts');
        cy.apiUpdateConfig({
            GuestAccountsSettings: {
                Enable: true,
            },
            ServiceSettings: {
                EnableMultifactorAuthentication: false,
            },
        });
        cy.visit('/admin_console/authentication/guest_access');
    });
    it('MM-18046 Verify Guest Access Screen', () => {
        cy.findByTestId('GuestAccountsSettings.Enable').should('be.visible').within(() => {
            cy.get('.control-label').should('be.visible').and('have.text', 'Enable Guest Access: ');
        });
        cy.findByTestId('GuestAccountsSettings.Enablehelp-text').should('be.visible').and('have.text', 'When true, external guest can be invited to channels within teams. Please see Permissions Schemes for which roles can invite guests.');
        cy.findByTestId('GuestAccountsSettings.RestrictCreationToDomains').should('be.visible').within(() => {
            cy.get('.control-label').should('be.visible').and('have.text', 'Whitelisted Guest Domains:');
        });
        cy.findByTestId('GuestAccountsSettings.RestrictCreationToDomainshelp-text').should('be.visible').and('have.text', '(Optional) Guest accounts can be created at the system level from this list of allowed guest domains.');
        cy.findByTestId('GuestAccountsSettings.EnforceMultifactorAuthentication').should('be.visible').within(() => {
            cy.get('.control-label').should('be.visible').and('have.text', 'Enforce Multi-factor Authentication: ');
        });
        cy.findByTestId('GuestAccountsSettings.EnforceMultifactorAuthenticationhelp-text').should('be.visible').and('have.text', 'Multi-factor authentication is currently not enabled.');
        cy.apiUpdateConfig({
            ServiceSettings: {
                EnableMultifactorAuthentication: true,
            },
        });
        cy.visit('/admin_console/authentication/guest_access');
        cy.findByTestId('GuestAccountsSettings.EnforceMultifactorAuthenticationhelp-text').should('be.visible').and('have.text', 'Multi-factor authentication is currently not enforced.');
    });
    it('MM-T1410 Confirmation Modal when Guest Access is disabled', () => {
        cy.findByTestId('GuestAccountsSettings.Enablefalse').click();
        cy.get('.error-message').should('be.visible').within(() => {
            cy.findByText('All current guest account sessions will be revoked, and marked as inactive').should('be.visible');
        });
        cy.get('#saveSetting').should('be.visible').click();
        cy.get('#confirmModal').should('be.visible').within(() => {
            cy.get('#genericModalLabel').should('be.visible').and('have.text', 'Save and Disable Guest Access?');
            cy.get('.ConfirmModal__body').should('be.visible').and('have.text', 'Disabling guest access will revoke all current Guest Account sessions. Guests will no longer be able to login and new guests cannot be invited into Mattermost. Guest users will be marked as inactive in user lists. Enabling this feature will not reinstate previous guest accounts. Are you sure you wish to remove these users?');
            cy.get('#confirmModalButton').should('have.text', 'Save and Disable Guest Access');
        });
        cy.get('#cancelModalButton').click();
        cy.get('#confirmModal').should('not.exist');
        cy.get('.error-message').should('be.visible');
        cy.get('#saveSetting').should('be.visible').click();
        cy.get('#confirmModalButton').should('be.visible').click().wait(TIMEOUTS.TWO_SEC);
        cy.get('.header__info').should('be.visible').click();
        cy.findByLabelText('Admin Console Menu').should('exist').within(() => {
            cy.findByText('Switch to eligendi').click();
        });
        cy.uiOpenTeamMenu('Invite people');
        cy.findByTestId('inviteGuestLink').should('not.exist');
        cy.get('.users-emails-input__control').should('be.visible');
    });
});