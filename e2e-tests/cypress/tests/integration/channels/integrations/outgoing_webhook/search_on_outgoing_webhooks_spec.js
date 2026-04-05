describe('Integrations', () => {
    let testTeam;
    let outgoingWebhook;
    const missing = 'missing';
    const Alpha = 'Alpha Common';
    const Bravo = 'Bravo & $ @';
    const Charlie = 'Charlie Common';
    const triggerA = 'apple';
    const triggerB = 'banana';
    const triggerC = 'carrot';
    before(() => {
        const callbackUrl = `${Cypress.env().webhookBaseUrl}/post_outgoing_webhook`;
        cy.requireWebhookServer();
        cy.apiInitSetup().then(({team}) => {
            testTeam = team.name;
            const firstOutgoingHook = {
                team_id: team.id,
                display_name: Alpha,
                trigger_words: [triggerA],
                callback_urls: [callbackUrl],
            };
            const secondOutgoingHook = {
                team_id: team.id,
                display_name: Bravo,
                trigger_words: [triggerB],
                callback_urls: [callbackUrl],
            };
            const thirdOutgoingHook = {
                team_id: team.id,
                display_name: Charlie,
                trigger_words: [triggerC],
                callback_urls: [callbackUrl],
            };
            cy.apiCreateWebhook(firstOutgoingHook, false).then((hook) => {
                outgoingWebhook = hook;
                cy.apiGetOutgoingWebhook(outgoingWebhook.id).then(({webhook, status}) => {
                    expect(status).equal(200);
                    expect(webhook.id).equal(outgoingWebhook.id);
                });
            });
            cy.apiCreateWebhook(secondOutgoingHook, false).then((hook) => {
                outgoingWebhook = hook;
                cy.apiGetOutgoingWebhook(outgoingWebhook.id).then(({webhook, status}) => {
                    expect(status).equal(200);
                    expect(webhook.id).equal(outgoingWebhook.id);
                });
            });
            cy.apiCreateWebhook(thirdOutgoingHook, false).then((hook) => {
                outgoingWebhook = hook;
                cy.apiGetOutgoingWebhook(outgoingWebhook.id).then(({webhook, status}) => {
                    expect(status).equal(200);
                    expect(webhook.id).equal(outgoingWebhook.id);
                });
            });
        });
    });
    it('MM-T614 Search on Outgoing Webhooks page', () => {
        cy.visit(`/${testTeam}/integrations/outgoing_webhooks`);
        cy.get('#searchInput').type('alpha');
        verifyWebhooksList([Alpha], [Bravo, Charlie]);
        cy.get('#searchInput').clear().type('BRAVO');
        verifyWebhooksList([Bravo], [Alpha, Charlie]);
        cy.get('#searchInput').clear().type('cHaRl');
        verifyWebhooksList([Charlie], [Alpha, Bravo]);
        cy.get('#searchInput').clear().type(missing);
        cy.get('.backstage-list').contains(`No outgoing webhooks match ${missing}`);
        cy.get('#searchInput').clear().type('$');
        verifyWebhooksList([Bravo], [Alpha, Charlie]);
        cy.get('#searchInput').clear().type('common');
        verifyWebhooksList([Alpha, Charlie], [Bravo]);
    });
});
function verifyWebhooksList(contain = [], notContain = []) {
    contain.forEach((name) => {
        cy.get('.backstage-list').findByText(name).should('be.visible');
    });
    notContain.forEach((name) => {
        cy.get('.backstage-list').findByText(name).should('not.exist');
    });
}