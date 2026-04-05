describe('Incoming webhook', () => {
    before(() => {
        const newSettings = {
            ServiceSettings: {
                EnableIncomingWebhooks: true,
            },
        };
        cy.apiUpdateConfig(newSettings);
        cy.apiInitSetup().then(({team}) => {
            cy.visit(`/${team.name}/integrations`);
            cy.get('#incomingWebhooks').should('be.visible');
        });
    });
    it('MM-T637 Copy icon for Incoming Webhook URL', () => {
        const title = 'test-title';
        const description = 'test-description';
        const channel = 'Town Square';
        cy.get('#incomingWebhooks').should('be.visible').click();
        cy.findByText('Add Incoming Webhook').should('be.visible').click();
        cy.findByLabelText('Title').should('be.visible').type(title);
        cy.findByLabelText('Description').should('be.visible').type(description);
        cy.get('#channelSelect').should('be.visible').select(channel);
        cy.findByText('Save').should('be.visible').click();
        cy.findByText('Setup Successful').should('be.visible');
        cy.findByTestId('copyText').should('be.visible');
        cy.findByText('Done').should('be.visible').click();
        cy.findByTestId('copyText').should('be.visible');
    });
});