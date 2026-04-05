describe('Custom Terms of Service', () => {
    let testUser;
    let testTeam;
    before(() => {
        cy.apiInitSetup().then(({team, user}) => {
            testUser = user;
            testTeam = team;
        });
    });
    it('MM-T1190 - Appears after creating new account and verifying email address', () => {
        const customTermsOfServiceText = 'Test custom terms of service';
        cy.apiVerifyUserEmailById(testUser.id);
        cy.apiAdminLogin();
        cy.apiUpdateConfig({
            EmailSettings: {
                RequireEmailVerification: true,
            },
        });
        cy.visit('/admin_console/compliance/custom_terms_of_service');
        cy.findByTestId('SupportSettings.CustomTermsOfServiceEnabledtrue').click();
        cy.findByTestId('SupportSettings.CustomTermsOfServiceTextinput').clear().type(customTermsOfServiceText);
        cy.get('#saveSetting').click();
        cy.apiLogin(testUser);
        cy.visit(`/${testTeam.name}/channels/town-square`);
        cy.findByTestId('termsOfService').should('be.visible').and('contain.text', customTermsOfServiceText);
        cy.get('#acceptTerms').should('be.visible').click();
        cy.url().should('include', `/${testTeam.name}/channels/town-square`);
    });
    it('MM-T1191 - Repeated edits must be agreed to', () => {
        const firstTOS = 'First custom terms of service';
        const secondTOS = 'Second custom terms of service';
        cy.apiAdminLogin();
        cy.apiUpdateConfig({
            EmailSettings: {
                RequireEmailVerification: false,
            },
            SupportSettings: {
                CustomTermsOfServiceEnabled: false,
            },
        });
        cy.visit('/admin_console/compliance/custom_terms_of_service');
        cy.findByTestId('SupportSettings.CustomTermsOfServiceEnabledtrue').click();
        cy.findByTestId('SupportSettings.CustomTermsOfServiceTextinput').clear().type(firstTOS);
        cy.get('#saveSetting').click();
        cy.get('#acceptTerms').should('be.visible').click();
        cy.url().should('include', '/admin_console/compliance/custom_terms_of_service');
        cy.apiLogin(testUser);
        cy.visit(`/${testTeam.name}/channels/town-square`);
        cy.findByTestId('termsOfService').should('be.visible').and('contain.text', firstTOS);
        cy.apiAdminLogin();
        cy.visit('/admin_console/compliance/custom_terms_of_service');
        cy.findByTestId('SupportSettings.CustomTermsOfServiceTextinput').clear().type(secondTOS);
        cy.get('#saveSetting').click();
        cy.findByTestId('termsOfService').should('be.visible').and('contain.text', secondTOS);
        cy.get('#acceptTerms').should('be.visible').click();
        cy.url().should('include', '/admin_console/compliance/custom_terms_of_service');
        cy.apiLogin(testUser);
        cy.visit(`/${testTeam.name}/channels/town-square`);
        cy.findByTestId('termsOfService').should('be.visible').and('contain.text', secondTOS);
        cy.get('#acceptTerms').should('be.visible').click();
        cy.url().should('include', `/${testTeam.name}/channels/town-square`);
    });
});