import {enableUsernameAndIconOverride} from './helpers';
describe('Incoming webhook', () => {
    let testTeam;
    let testChannel;
    let siteName;
    before(() => {
        cy.apiGetConfig().then(({config}) => {
            siteName = config.TeamSettings.SiteName;
        });
        cy.apiInitSetup().then(({team, channel}) => {
            testTeam = team;
            testChannel = channel;
        });
    });
    it('MM-T645 Delete Incoming Webhook', () => {
        cy.apiAdminLogin();
        enableUsernameAndIconOverride(true);
        cy.visit(`${testTeam.name}/channels/${testChannel.name}`);
        cy.uiOpenProductMenu('Integrations');
        cy.url().should('include', `${testTeam.name}/integrations`);
        cy.get('.backstage-sidebar').should('be.visible').findByText('Incoming Webhooks').click();
        cy.url().should('include', `${testTeam.name}/integrations/incoming_webhooks`);
        cy.findByText('Add Incoming Webhook').click();
        cy.url().should('include', `${testTeam.name}/integrations/incoming_webhooks/add`);
        cy.get('.backstage-form').should('be.visible').within(() => {
            cy.get('#displayName').type('Webhook Title');
            cy.get('#description').type('Webhook Description');
            cy.get('#channelSelect').select(testChannel.display_name);
            cy.findByText('Save').scrollIntoView().click();
        });
        cy.url().should('include', `${testTeam.name}/integrations/confirm?type=incoming_webhooks&id=`).
            invoke('toString').then((hookConfirmationUrl) => {
                const hookId = hookConfirmationUrl.split('id=')[1];
                const hookUrl = `${Cypress.config('baseUrl')}/hooks/${hookId}`;
                cy.findByText(hookUrl).should('be.visible').
                    parent().siblings('.fa-copy').should('be.visible');
                cy.findByText('Done').click();
                cy.url().should('include', `${testTeam.name}/integrations/incoming_webhooks`);
                cy.findByText(`Back to ${siteName}`).click();
                cy.url().should('include', `${testTeam.name}/channels/${testChannel.name}`);
                const payload = {
                    channel: testChannel.name,
                    username: 'new-username',
                    text: 'Setup for incoming webhook.',
                };
                cy.postIncomingWebhook({url: hookUrl, data: payload, waitFor: 'text'});
                cy.getLastPostId().then((postId) => {
                    cy.get(`#${postId}_message`).should('exist').within(() => {
                        cy.findByText('Setup for incoming webhook.').should('exist');
                    });
                });
                cy.uiOpenProductMenu('Integrations');
                cy.url().should('include', `${testTeam.name}/integrations`);
                cy.get('.backstage-sidebar').should('be.visible').findByText('Incoming Webhooks').click();
                cy.url().should('include', `${testTeam.name}/integrations/incoming_webhooks`);
                cy.findByText('Delete').click();
                cy.get('#confirmModalButton > span').click();
                cy.findByText(`Back to ${siteName}`).click();
                cy.url().should('include', `${testTeam.name}/channels/${testChannel.name}`);
                const payload1 = {
                    channel: testChannel.name,
                    username: 'new-username',
                    text: 'after deleting incoming webhook.',
                };
                cy.task('postIncomingWebhook', {url: hookUrl, data: payload1}).then((res) => {
                    expect(res.status).equal(400);
                    expect(res.data.message).equal('Invalid webhook.');
                });
            });
    });
});