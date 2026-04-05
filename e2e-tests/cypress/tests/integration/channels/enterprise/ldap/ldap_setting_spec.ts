describe('LDAP settings', () => {
    beforeEach(() => {
        cy.apiAdminLogin();
        cy.apiRequireLicenseForFeature('LDAP');
    });
    it('MM-T2699 Connection test button - Successful', () => {
        cy.visitLDAPSettings();
        cy.findByRole('button', {name: /test connection/i}).click();
        cy.findByText(/test connection successful/i).should('be.visible');
        cy.findByTitle(/success icon/i).should('be.visible');
    });
    it('MM-T2700 LDAP username required', () => {
        cy.visitLDAPSettings();
        cy.findByLabelText(/username attribute:/i).click().clear();
        cy.findByRole('button', {name: /save/i}).click();
        cy.findByText('AD/LDAP field "Username Attribute" is required.').should('be.visible');
        cy.findByLabelText(/username attribute:/i).click().type('uid');
        cy.findByRole('button', {name: /save/i}).click();
        cy.findByRole('button', {name: /save/i}).should('be.disabled');
    });
    it('MM-T2701 LDAP LoginidAttribute required', () => {
        cy.visitLDAPSettings();
        cy.findByTestId('LdapSettings.LoginIdAttributeinput').click().clear();
        cy.findByRole('button', {name: /save/i}).click();
        cy.findByText(/ad\/ldap field "login id attribute" is required./i).should('be.visible');
    });
    it('MM-T2704 Create new LDAP account from login page', () => {
        const testSettings = {
            user: {
                username: 'test.two',
                password: 'Password1',
            },
            siteName: 'Mattermost',
        };
        cy.doLDAPLogin(testSettings);
        cy.findByText(/logout/i).should('be.visible');
    });
});