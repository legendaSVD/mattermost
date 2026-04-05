describe('Customization', () => {
    it('MM-T5379 - Should match title and custom description in root html', () => {
        const defaultTitle = 'Mattermost';
        const defaultDescription = 'Log in';
        const customTitle = 'Custom site name';
        const customDescription = 'Custom description';
        cy.apiLogout();
        cy.visit('/login');
        cy.get('head').find('title').should('have.text', `${defaultDescription} - ${defaultTitle}`);
        cy.get('head').get('meta[property="og:description"]').should('not.exist');
        cy.get('.header-logo-link').should('have.text', '').and('have.attr', 'href', '/').find('svg').should('be.visible');
        cy.get('.login-body-card-title').should('be.visible').and('have.text', defaultDescription);
        cy.apiAdminLogin();
        cy.apiUpdateConfig({TeamSettings: {SiteName: customTitle, CustomDescriptionText: customDescription}});
        cy.apiLogout();
        cy.visit('');
        cy.get('head').find('title').should('have.text', `${defaultDescription} - ${customTitle}`);
        cy.get('head').get('meta[property="og:description"]').should('have.attr', 'content', customDescription);
        cy.get('.header-logo-link').should('have.text', customTitle).and('have.attr', 'href', '/');
        cy.get('.login-body-card-title').should('be.visible').and('have.text', customDescription);
    });
});