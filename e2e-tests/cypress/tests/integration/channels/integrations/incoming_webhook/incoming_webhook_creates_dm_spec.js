import {enableUsernameAndIconOverride} from './helpers';
describe('Incoming webhook', () => {
    const incomingWebhookText = 'This is a message to a newly created direct message channel';
    let incomingWebhookConfiguration;
    let incomingWebhook;
    let generatedTeam;
    let generatedChannel;
    let generatedUser;
    before(() => {
        enableUsernameAndIconOverride(true, false);
        cy.apiInitSetup({userPrefix: 'mm-t639-'}).then(({team, channel, user}) => {
            generatedTeam = team;
            generatedChannel = channel;
            generatedUser = user;
            incomingWebhookConfiguration = {
                channel_id: channel.id,
                channel_locked: false,
                display_name: 'webhook',
            };
            cy.apiCreateWebhook(incomingWebhookConfiguration).then((hook) => {
                incomingWebhook = hook;
            });
        }).then(() => {
            const webhookPayload = {channel: `@${generatedUser.username}`, text: incomingWebhookText};
            cy.postIncomingWebhook({url: incomingWebhook.url, data: webhookPayload});
        }).then(() => {
            cy.visit(`/${generatedTeam.name}/channels/${generatedChannel.name}`);
        });
    });
    it('MM-T639 🚀 incoming Webhook creates DM', () => {
        cy.uiGetLHS().
            contains(generatedUser.username).
            should('have.class', 'unread-title').
            click();
        cy.getLastPost().within(($post) => {
            cy.wrap($post).contains(incomingWebhookConfiguration.display_name).should('be.visible');
            cy.wrap($post).contains('BOT').should('be.visible');
            cy.wrap($post).contains(incomingWebhookText).should('be.visible');
        });
    });
});