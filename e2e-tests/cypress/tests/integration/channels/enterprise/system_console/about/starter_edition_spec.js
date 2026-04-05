describe('System console', () => {
    before(() => {
        cy.shouldNotRunOnCloudEdition();
        cy.apiDeleteLicense();
    });
    it('MM-T5132 License page shows View plans button', () => {
        cy.visit('/admin_console/about/license');
        cy.get('.StarterLeftPanel').get('#starter_edition_view_plans').contains('View plans');
        cy.get('.StarterLeftPanel').get('#starter_edition_view_plans').click();
        cy.get('#pricingModal').should('exist');
    });
});