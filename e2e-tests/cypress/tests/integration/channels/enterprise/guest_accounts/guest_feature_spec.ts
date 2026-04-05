describe('Guest Accounts', () => {
    let guestUser: Cypress.UserProfile;
    before(() => {
        cy.apiRequireLicenseForFeature('GuestAccounts');
        cy.apiCreateGuestUser({}).then(({guest}) => {
            guestUser = guest;
        });
    });
    it('MM-T1411 Update Guest Users in User Management when Guest feature is disabled', () => {
        cy.visit('/admin_console/authentication/guest_access');
        cy.findByTestId('GuestAccountsSettings.Enabletrue').check();
        cy.get('#saveSetting').then((btn) => {
            if (btn.is(':enabled')) {
                btn.on('click', () => {});
                cy.waitUntil(() => cy.get('#saveSetting').then((el) => {
                    return el[0].innerText === 'Save';
                }));
            }
        });
        checkUserListStatus(guestUser, 'Guest');
        cy.visit('/admin_console/authentication/guest_access');
        cy.findByTestId('GuestAccountsSettings.Enablefalse').check();
        cy.get('#saveSetting').scrollIntoView().click();
        cy.get('#confirmModal').should('be.visible').within(() => {
            cy.get('#confirmModalButton').should('have.text', 'Save and Disable Guest Access').click();
        });
        checkUserListStatus(guestUser, 'Deactivated');
        cy.visit('/admin_console/authentication/guest_access');
        cy.findByTestId('GuestAccountsSettings.Enabletrue').check();
        cy.get('#saveSetting').scrollIntoView().click();
        checkUserListStatus(guestUser, 'Deactivated');
    });
    function checkUserListStatus(user, status) {
        cy.visit('/admin_console/user_management/users');
        cy.get('#input_searchTerm').should('be.visible').type(user.username);
        cy.get('#actionMenuButton-systemUsersTable-0').should('have.text', status);
        cy.get('#systemUsersTable-cell-0_emailColumn').should('have.text', user.email);
    }
});