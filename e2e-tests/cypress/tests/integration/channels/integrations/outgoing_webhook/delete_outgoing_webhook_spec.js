import * as TIMEOUTS from '../../../../fixtures/timeouts';
describe('Integrations', () => {
    let testTeam;
    let testChannel;
    let testUser;
    let outgoingWebhook;
    before(() => {
        const callbackUrl = `${Cypress.env().webhookBaseUrl}/post_outgoing_webhook`;
        cy.requireWebhookServer();
        cy.apiInitSetup().then(({team, channel, user}) => {
            testTeam = team.name;
            testChannel = channel.name;
            testUser = user;
            const newOutgoingHook = {
                team_id: team.id,
                display_name: 'New Outgoing Webhook',
                trigger_words: ['testing'],
                callback_urls: [callbackUrl],
            };
            cy.apiCreateWebhook(newOutgoingHook, false).then((hook) => {
                outgoingWebhook = hook;
                cy.apiGetOutgoingWebhook(outgoingWebhook.id).then(({webhook, status}) => {
                    expect(status).equal(200);
                    expect(webhook.id).equal(outgoingWebhook.id);
                });
            });
            cy.apiLogin(user);
        });
    });
    it('MM-T617 Delete outgoing webhook', () => {
        cy.visit(`/${testTeam}/channels/${testChannel}`);
        cy.postMessage('testing');
        cy.uiWaitUntilMessagePostedIncludes('Outgoing Webhook Payload');
        cy.apiAdminLogin();
        cy.apiGetOutgoingWebhook(outgoingWebhook.id).then(({status}) => {
            expect(status).equal(200);
        });
        cy.visit(`/${testTeam}/integrations/outgoing_webhooks`);
        cy.findAllByText('Delete', {timeout: TIMEOUTS.ONE_MIN}).click();
        cy.get('#confirmModalButton').click();
        cy.findByText('No outgoing webhooks found').should('exist');
        cy.apiGetOutgoingWebhook(outgoingWebhook.id).then(({status}) => {
            expect(status).equal(404);
        });
        cy.apiLogin(testUser);
        cy.visit(`/${testTeam}/channels/${testChannel}`);
        cy.postMessage('testing');
        cy.wait(TIMEOUTS.TWO_SEC);
        cy.getLastPostId().then((lastPostId) => {
            cy.get(`#${lastPostId}_message`).should('not.contain', 'Outgoing Webhook Payload');
        });
        cy.apiAdminLogin();
        cy.apiGetOutgoingWebhook(outgoingWebhook.id).then(({status}) => {
            expect(status).equal(404);
        });
    });
});