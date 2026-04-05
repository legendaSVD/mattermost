import {enableUsernameAndIconOverride} from './helpers';
describe('Incoming webhook', () => {
    let testTeam;
    let siteName;
    before(() => {
        cy.apiGetConfig().then(({config}) => {
            siteName = config.TeamSettings.SiteName;
        });
        cy.apiInitSetup().then(({team}) => {
            testTeam = team;
        });
    });
    it('MM-T625 Incoming webhook is image only', () => {
        cy.apiAdminLogin();
        enableUsernameAndIconOverride(true);
        cy.visit(`${testTeam.name}/channels/off-topic`);
        cy.uiOpenProductMenu('Integrations');
        cy.url().should('include', `${testTeam.name}/integrations`);
        cy.get('.backstage-sidebar').should('be.visible').findByText('Incoming Webhooks').click();
        cy.url().should('include', `${testTeam.name}/integrations/incoming_webhooks`);
        cy.findByText('Add Incoming Webhook').click();
        cy.url().should('include', `${testTeam.name}/integrations/incoming_webhooks/add`);
        cy.get('.backstage-form').should('be.visible').within(() => {
            cy.get('#displayName').type('Webhook Title');
            cy.get('#description').type('Webhook Description');
            cy.get('#channelSelect').select('Off-Topic');
            cy.findByText('Save').scrollIntoView().click();
        });
        cy.url().should('include', `${testTeam.name}/integrations/confirm?type=incoming_webhooks&id=`).
            invoke('toString').then((hookConfirmationUrl) => {
                const hookId = hookConfirmationUrl.split('id=')[1];
                const hookUrl = `${Cypress.config('baseUrl')}/hooks/${hookId}`;
                cy.findByText(hookUrl).should('be.visible').
                    parent().siblings('[data-testid="copyText"]').should('be.visible');
                cy.findByText('Done').click();
                cy.url().should('include', `${testTeam.name}/integrations/incoming_webhooks`);
                cy.findByText(`Back to ${siteName}`).click();
                cy.url().should('include', `${testTeam.name}/channels/off-topic`);
                const payload = {
                    channel: 'off-topic',
                    username: 'new-username',
                    attachments: [{image_url: 'https://cdn.pixabay.com/photo/2017/10/10/22/24/wide-format-2839089_960_720.jpg'}],
                };
                cy.postIncomingWebhook({url: hookUrl, data: payload});
                cy.get('.attachment__image').should('be.visible');
            });
    });
});