describe('Site URL', () => {
    before(() => {
        cy.shouldNotRunOnCloudEdition();
    });
    it('MM-T3279 - Don\'t allow clearing site URL in System Console', () => {
        cy.visit('/admin_console/environment/web_server');
        cy.findByTestId('ServiceSettings.SiteURLinput').invoke('val').then((originalSiteURLValue) => {
            cy.findByTestId('ServiceSettings.SiteURLinput').clear();
            cy.findAllByTestId('saveSetting').click();
            cy.waitUntil(() => cy.findAllByTestId('saveSetting').then((el) => {
                return el[0].innerText === 'Save';
            }));
            cy.findByTestId('errorMessage').contains('Site URL cannot be cleared.');
            cy.visit('/admin_console/environment/web_server');
            cy.findByTestId('ServiceSettings.SiteURLinput').should('have.value', originalSiteURLValue);
        });
    });
});