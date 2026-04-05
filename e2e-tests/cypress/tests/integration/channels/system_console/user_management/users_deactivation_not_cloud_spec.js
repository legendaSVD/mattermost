import * as TIMEOUTS from '../../../../fixtures/timeouts';
describe('System Console > User Management > Deactivation', () => {
    let testUser;
    before(() => {
        cy.shouldNotRunOnCloudEdition();
        cy.apiInitSetup().then(({user}) => {
            testUser = user;
        });
        cy.visit('/admin_console');
    });
    it('MM-T947 When deactivating users in the System Console, email address should not disappear', () => {
        cy.findByTestId('user_management.system_users').should('be.visible').click();
        cy.findByPlaceholderText('Search users').should('be.visible').clear().type(testUser.email).wait(TIMEOUTS.HALF_SEC);
        cy.findByText(`${testUser.username}`).should('be.visible');
        cy.get('#systemUsersTable-cell-0_emailColumn').should('be.visible').should('have.text', testUser.email);
        cy.get('#actionMenuButton-systemUsersTable-0').should('have.text', 'Member').click().wait(TIMEOUTS.HALF_SEC);
        cy.get('#actionMenuItem-systemUsersTable-0-deactivate').should('have.text', 'Deactivate').click();
        cy.get('.a11y__modal').should('exist').and('be.visible').within(() => {
            cy.findByText('Deactivate').should('be.visible').click();
        });
        cy.get('#actionMenuButton-systemUsersTable-0').should('have.text', 'Deactivated').should('be.visible');
        cy.findByText(testUser.email).should('be.visible');
        cy.get('#systemUsersTable-cell-0_emailColumn').should('be.visible').should('have.text', testUser.email);
    });
});