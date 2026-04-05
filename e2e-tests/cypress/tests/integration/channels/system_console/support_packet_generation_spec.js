describe('Support Packet Generation', () => {
    it('MM-T3817 - Commercial Support Dialog UI - No License', () => {
        cy.apiAdminLogin();
        cy.apiDeleteLicense();
        cy.visit('/admin_console');
        cy.findByRole('button', {name: 'Menu Icon'}).should('exist').click();
        cy.findByRole('link', {name: 'Commercial Support'}).and('have.attr', 'href').and('include', '/commercial-support/');
    });
});