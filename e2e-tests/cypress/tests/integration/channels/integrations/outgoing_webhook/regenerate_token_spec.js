describe('Integrations', () => {
    let testTeam;
    let testChannel;
    before(() => {
        const callbackUrl = `${Cypress.env().webhookBaseUrl}/post_outgoing_webhook`;
        cy.requireWebhookServer();
        cy.apiInitSetup().then(({team, channel}) => {
            testTeam = team.name;
            testChannel = channel.name;
            const newOutgoingHook = {
                team_id: team.id,
                display_name: 'New Outgoing Webhook',
                trigger_words: ['testing'],
                callback_urls: [callbackUrl],
            };
            cy.apiCreateWebhook(newOutgoingHook, false);
            cy.visit(`/${testTeam}/integrations/outgoing_webhooks`);
        });
    });
    it('MM-T612 Regenerate token', () => {
        let generatedToken;
        cy.get('.item-details__token').then((number1) => {
            generatedToken = number1.text().split(' ').pop();
            cy.visit(`/${testTeam}/channels/${testChannel}`);
            cy.postMessage('testing');
            cy.uiWaitUntilMessagePostedIncludes(generatedToken);
            cy.visit(`/${testTeam}/integrations/outgoing_webhooks`);
            cy.findAllByText('Regenerate Token').click();
            cy.waitUntil(() => cy.get('.item-details__token').then((el) => {
                return !el[0].innerText.includes(generatedToken);
            }));
            let regeneratedToken;
            cy.get('.item-details__token').then((number2) => {
                regeneratedToken = number2.text().split(' ').pop();
                cy.visit(`/${testTeam}/channels/${testChannel}`);
                cy.postMessage('testing');
                cy.uiWaitUntilMessagePostedIncludes(regeneratedToken).then(() => {
                    cy.getLastPostId().then((lastPostId) => {
                        cy.get(`#${lastPostId}_message`).should('not.contain', generatedToken);
                    });
                });
            });
        });
    });
});