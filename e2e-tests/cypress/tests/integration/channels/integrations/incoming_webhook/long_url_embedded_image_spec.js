describe('Integrations', () => {
    let testUser;
    let testTeam;
    let testChannel;
    let newIncomingHook;
    let incomingWebhook;
    before(() => {
        cy.apiInitSetup().then(({user}) => {
            testUser = user;
            cy.apiLogin(testUser).then(() => {
                cy.apiCreateTeam('test-team', 'Team Testers').then(({team}) => {
                    testTeam = team;
                    cy.apiCreateChannel(testTeam.id, 'test-channel', 'Testers Channel').then(({channel}) => {
                        testChannel = channel;
                        newIncomingHook = {
                            channel_id: testChannel.id,
                            channel_locked: true,
                            description: 'Test Webhook Description',
                            display_name: 'Test Webhook Name',
                        };
                        cy.apiCreateWebhook(newIncomingHook).then((hook) => {
                            incomingWebhook = hook;
                        });
                        cy.visit(`/${testTeam.name}/channels/${testChannel.name}`);
                    });
                });
            });
        });
    });
    it('MM-T643 Incoming webhook:Long URL for embedded image', () => {
        const letters = 'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ';
        const queries = letters.split('').reduce((acc, letter) => {
            const newValue = acc + `&${letter}=${letters}`;
            return newValue;
        }, '');
        const url = `http:
        const payload = getPayload(testChannel, url);
        cy.postIncomingWebhook({url: incomingWebhook.url, data: payload});
        cy.uiWaitUntilMessagePostedIncludes('Hey attachments');
        cy.getLastPostId().then(() => {
            const baseUrl = Cypress.config('baseUrl');
            const encodedUrl = `${baseUrl}/api/v4/image?url=${encodeURIComponent(url)}`;
            cy.findByLabelText('file thumbnail').should('be.visible').and('have.attr', 'src', encodedUrl);
            cy.findByText('Show more').should('be.visible').click();
            cy.findByText('Show less').scrollIntoView().should('be.visible');
        });
    });
});
function getPayload(channel, url) {
    const text = `Hey attachments ![graph](${url}).${'Lorem ipsum dolor '.repeat(240)}.`;
    return {
        channel: channel.name,
        text,
    };
}