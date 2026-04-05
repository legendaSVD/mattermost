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
            cy.apiLogin(testUser);
        });
    });
    it('MM-T613 Disable outgoing webhooks in System Console', () => {
        cy.visit(`/${testTeam}/channels/${testChannel}`);
        cy.postMessage('testing');
        cy.uiWaitUntilMessagePostedIncludes('Outgoing Webhook Payload');
        cy.apiAdminLogin();
        cy.apiGetOutgoingWebhook(outgoingWebhook.id).then(({status}) => {
            expect(status).equal(200);
        });
        cy.visit('/admin_console/integrations/integration_management');
        cy.findByTestId('ServiceSettings.EnableOutgoingWebhooksfalse').click().should('be.checked');
        cy.get('#saveSetting').click();
        cy.get('#saveSetting').should('be.disabled');
        cy.apiAdminLogin();
        cy.apiGetOutgoingWebhook(outgoingWebhook.id).then(({status}) => {
            expect(status).equal(501);
        });
        cy.apiLogin(testUser);
        cy.visit(`/${testTeam}/channels/${testChannel}`);
        cy.postMessage('testing');
        cy.wait(TIMEOUTS.TWO_SEC);
        cy.getLastPostId().then((lastPostId) => {
            cy.get(`#${lastPostId}_message`).should('not.contain', 'Outgoing Webhook Payload');
        });
        cy.apiAdminLogin();
        cy.visit('/admin_console/integrations/integration_management');
        cy.findByTestId('ServiceSettings.EnableOutgoingWebhookstrue').click().should('be.checked');
        cy.get('#saveSetting').click();
        cy.apiGetOutgoingWebhook(outgoingWebhook.id).then(({status}) => {
            expect(status).equal(200);
        });
        cy.apiLogin(testUser);
        cy.visit(`/${testTeam}/channels/${testChannel}`);
        cy.postMessage('testing');
        cy.uiWaitUntilMessagePostedIncludes('Outgoing Webhook Payload');
    });
});