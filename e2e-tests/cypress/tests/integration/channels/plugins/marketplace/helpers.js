export function verifyPluginMarketplaceVisibility(shouldBeVisible) {
    cy.uiOpenProductMenu().within(() => {
        if (shouldBeVisible) {
            cy.findByText('App Marketplace').should('exist');
        } else {
            cy.findByText('App Marketplace').should('not.exist');
        }
    });
}