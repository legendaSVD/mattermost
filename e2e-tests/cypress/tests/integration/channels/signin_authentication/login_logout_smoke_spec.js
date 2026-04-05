describe('SignIn Authentication', () => {
    let testUser;
    before(() => {
        cy.apiInitSetup().then(({user}) => {
            testUser = user;
            cy.apiLogout();
            cy.visit('/login');
            cy.get('.login-body-card-title').click();
        });
    });
    it('MM-T3080 Sign in email/pwd account', () => {
        cy.apiGetClientLicense().then(({isLicensed}) => {
            const loginPlaceholder = isLicensed ? 'Email, Username or AD/LDAP Username' : 'Email or Username';
            cy.findByPlaceholderText(loginPlaceholder).clear().type(testUser.email);
            cy.findByPlaceholderText('Password').clear().type(testUser.password);
            cy.get('#saveSetting').should('not.be.disabled').click();
            cy.url().should('include', '/channels/town-square');
            cy.uiOpenUserMenu('Log out');
            cy.url().should('include', '/login');
            cy.get('.login-body-card-title').click();
            cy.findByPlaceholderText(loginPlaceholder).clear().type(testUser.username);
            cy.findByPlaceholderText('Password').clear().type(testUser.password);
            cy.get('#saveSetting').should('not.be.disabled').click();
            cy.url().should('include', '/channels/town-square');
        });
    });
});