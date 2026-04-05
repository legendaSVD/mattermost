describe('Cluster', () => {
    before(() => {
        cy.shouldNotRunOnCloudEdition();
        cy.apiRequireLicense();
        cy.apiUpdateConfig({
            ClusterSettings: {
                Enable: null,
                EnableGossipEncryption: null,
            },
        });
        cy.visit('/admin_console/environment/high_availability');
    });
    it('SC25050 - Can change Gossip Encryption', () => {
        cy.findByTestId('EnableGossipEncryption').scrollIntoView().should('be.visible').within(() => {
            cy.get('.control-label').should('be.visible').and('have.text', 'Enable Gossip encryption:');
            const contents = 'When true, all communication through the gossip protocol will be encrypted.';
            cy.get('.help-text').should('be.visible').and('have.text', contents);
            cy.get('#EnableGossipEncryptiontrue').should('have.attr', 'checked');
        });
        cy.apiUpdateConfig({
            ClusterSettings: {
                Enable: true,
                EnableGossipEncryption: true,
            },
        });
        cy.reload();
        cy.findByTestId('EnableGossipEncryption').scrollIntoView().should('be.visible').within(() => {
            cy.get('#EnableGossipEncryptiontrue').should('have.attr', 'checked');
        });
    });
    it('Can change Gossip Compression', () => {
        cy.findByTestId('EnableGossipCompression').scrollIntoView().should('be.visible').within(() => {
            cy.get('.control-label').should('be.visible').and('have.text', 'Enable Gossip compression:');
            const contents = 'When true, all communication through the gossip protocol will be compresssed. It is recommended to keep this flag disabled.';
            cy.get('.help-text').should('be.visible').and('have.text', contents);
            cy.get('#EnableGossipCompressiontrue').should('have.attr', 'checked');
        });
        cy.apiUpdateConfig({
            ClusterSettings: {
                Enable: true,
                EnableGossipCompression: false,
            },
        });
        cy.reload();
        cy.findByTestId('EnableGossipCompression').scrollIntoView().should('be.visible').within(() => {
            cy.get('#EnableGossipCompressionfalse').should('have.attr', 'checked');
        });
    });
});