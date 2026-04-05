describe('Authentication', () => {
    beforeEach(() => {
        cy.apiAdminLogin();
    });
    after(() => {
        cy.apiAdminLogin({failOnStatusCode: false});
        cy.apiUpdateConfig({});
    });
    const testCases = [
        {
            title: 'MM-T1767 - Email signin false Username signin true',
            signinWithEmail: false,
            signinWithUsername: true,
        },
        {
            title: 'MM-T1768 - Email signin true Username signin true',
            signinWithEmail: true,
            signinWithUsername: true,
        },
        {
            title: 'MM-T1769 - Email signin true Username signin false',
            signinWithEmail: true,
            signinWithUsername: false,
        },
    ];
    testCases.forEach(({title, signinWithEmail, signinWithUsername}) => {
        it(title, () => {
            cy.apiUpdateConfig({
                EmailSettings: {
                    EnableSignInWithEmail: signinWithEmail,
                    EnableSignInWithUsername: signinWithUsername,
                },
                LdapSettings: {
                    Enable: false,
                },
            });
            cy.apiLogout();
            cy.visit('/login');
            cy.focused().blur();
            let expectedPlaceholderText;
            if (signinWithEmail && signinWithUsername) {
                expectedPlaceholderText = 'Email or Username';
            } else if (signinWithEmail) {
                expectedPlaceholderText = 'Email';
            } else {
                expectedPlaceholderText = 'Username';
            }
            cy.findByPlaceholderText(expectedPlaceholderText).should('exist').and('be.visible');
        });
    });
});