describe('Integrations', () => {
    let testTeam;
    let testChannel;
    before(() => {
        cy.apiInitSetup().then(({team, channel}) => {
            testTeam = team.name;
            testChannel = channel.display_name;
        });
    });
    it('MM-T616 Copy icon for Outgoing Webhook token', () => {
        cy.visit(`/${testTeam}/integrations/outgoing_webhooks/add`);
        cy.url().should('include', '/outgoing_webhooks/add');
        cy.get('#displayName').type('test');
        cy.get('#channelSelect').select(testChannel);
        cy.get('#triggerWords').type('trigger');
        cy.get('#callbackUrls').type('https://mattermost.com');
        cy.findByText('Save').click();
        cy.findByText('Setup Successful').should('be.visible');
        cy.findByTestId('copyText').should('be.visible');
        cy.findByText('Done').click();
        cy.get('#addOutgoingWebhook').should('exist');
        cy.findByTestId('copyText').should('be.visible');
    });
});