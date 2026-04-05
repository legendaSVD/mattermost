describe('Integrations', () => {
    let newIncomingHook;
    before(() => {
        cy.apiInitSetup().then(({team, channel}) => {
            newIncomingHook = {
                channel_id: channel.id,
                channel_locked: true,
                description: 'Test Webhook Description',
                display_name: 'Test Webhook Name',
            };
            cy.apiCreateWebhook(newIncomingHook);
            cy.visit(`/${team.name}/integrations/incoming_webhooks`);
        });
    });
    it('MM-T640 Cancel out of edit', () => {
        cy.findByText('Edit').click();
        cy.get('#displayName').type('name changed');
        cy.get('#description').type('description changed ');
        cy.get('#channelSelect').select('Town Square');
        cy.get('#channelLocked').uncheck();
        cy.findByText('Cancel').click();
        cy.findAllByText(newIncomingHook.display_name).should('be.visible');
        cy.findAllByText(newIncomingHook.description).should('be.visible');
        cy.findByText('Delete').should('be.visible');
        cy.findByText('Edit').click();
        cy.get('#channelLocked').should('be.checked');
    });
});