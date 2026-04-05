describe('Settings', () => {
    before(() => {
        cy.shouldRunOnTeamEdition();
    });
    it('MM-T1149 Hide mobile-specific settings', () => {
        cy.visit('/admin_console/site_config/file_sharing_downloads');
        cy.get('#adminConsoleWrapper .wrapper--fixed > .admin-console__wrapper').
            should('be.visible').
            and('contain.text', 'Allow File Sharing');
        cy.get('#adminConsoleWrapper .wrapper--fixed > .admin-console__wrapper').
            should('be.visible').
            and('not.contain.text', 'Allow File Uploads on Mobile');
        cy.get('#adminConsoleWrapper .wrapper--fixed > .admin-console__wrapper').
            should('be.visible').
            and('not.contain.text', 'Allow File Downloads on Mobile');
    });
});