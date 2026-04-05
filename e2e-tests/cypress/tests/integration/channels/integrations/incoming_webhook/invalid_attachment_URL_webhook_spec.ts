describe('Integrations/Incoming Webhook', () => {
    let incomingWebhook;
    let testChannel;
    before(() => {
        cy.apiUpdateConfig({
            ServiceSettings: {
                EnablePostIconOverride: true,
            },
        });
        cy.apiInitSetup().then(({team, channel}) => {
            testChannel = channel;
            const newIncomingHook = {
                channel_id: channel.id,
                channel_locked: true,
                description: 'Incoming webhook - Viewing attachments with invalid URL does not cause the application to crash',
                display_name: 'invalid_attachment_URL_webhook',
            };
            cy.apiCreateWebhook(newIncomingHook).then((hook) => {
                incomingWebhook = hook;
            });
            cy.visit(`/${team.name}/channels/${channel.name}`);
        });
    });
    it('MM-T624 Viewing attachments with invalid URL does not cause the application to crash', () => {
        const payload = {
            channel: testChannel.name,
            text: 'The image below should be broken due to the invalid URL in the payload text you just sent.',
            attachments: [{
                fallback: 'Testing viewing attachments with invalid URL does not cause the application to crash.',
                pretext: 'Testing viewing attachments with invalid URL does not cause the application to crash.',
                image_url: 'https://example.com',
            }],
            icon_url: 'http://www.mattermost.org/wp-content/uploads/2016/04/icon_WS.png',
        };
        cy.postIncomingWebhook({url: incomingWebhook.url, data: payload, waitFor: 'attachment-pretext'});
        cy.waitUntil(() => cy.getLastPost().then((el) => {
            const postedMessageEl = el.find('.post-message__text > p')[0];
            return Boolean(postedMessageEl && postedMessageEl.textContent.includes('The image below should be broken due to the invalid URL in the payload text you just sent.'));
        }));
        cy.getLastPostId().then((postId) => {
            const postMessageId = `#${postId}_message`;
            cy.get(postMessageId).within(() => {
                cy.get('.attachment__image').should('be.visible');
            });
        });
    });
});