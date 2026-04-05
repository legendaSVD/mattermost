describe('Account Settings', () => {
    before(() => {
        cy.apiInitSetup({loginAfter: true}).then(({offTopicUrl}) => {
            cy.visit(offTopicUrl);
        });
    });
    it('MM-T2045 Full Name - Link in help text', () => {
        cy.uiOpenProfileModal('Profile Settings');
        cy.get('#generalSettingsTitle').should('be.visible').should('contain', 'Profile');
        cy.get('#nameEdit').click();
        cy.get('#extraInfo').within(() => {
            cy.findByText('Notifications').click();
        });
        cy.findByRole('dialog', {name: 'Profile'}).should('be.visible');
        cy.get('#notificationSettingsTitle').should('be.visible').should('contain', 'Notifications');
    });
});