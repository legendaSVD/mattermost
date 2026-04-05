describe('Integrations', () => {
    let teamA;
    let teamB;
    let newIncomingHook;
    before(() => {
        cy.apiInitSetup().then(({team, channel}) => {
            teamA = team.name;
            newIncomingHook = {
                channel_id: channel.id,
                display_name: 'Team A Webhook',
            };
            cy.apiCreateWebhook(newIncomingHook);
        });
        cy.apiInitSetup().then(({team, channel}) => {
            teamB = team.name;
            newIncomingHook = {
                channel_id: channel.id,
                display_name: 'Team B Webhook',
            };
            cy.apiCreateWebhook(newIncomingHook);
        });
    });
    it('MM-T644 Integrations display on team where they were created', () => {
        cy.visit(`/${teamB}/integrations/incoming_webhooks`);
        cy.findByText('Team B Webhook').and('does.not.contain', 'Team A Webhook');
        cy.visit(`/${teamA}/integrations/incoming_webhooks`);
        cy.findByText('Team A Webhook').and('does.not.contain', 'Team B Webhook');
    });
});