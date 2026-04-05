describe('Integrations', () => {
    let testTeam;
    let offTopicChannel;
    before(() => {
        cy.requireWebhookServer();
        cy.apiInitSetup().then(({team}) => {
            testTeam = team;
            cy.apiGetChannelByName(team.name, 'off-topic').then(({channel}) => {
                offTopicChannel = channel;
            });
        });
    });
    beforeEach(() => {
        cy.visit(`/${testTeam.name}/channels/town-square`);
    });
    it('MM-T706 Error Handling for Slash Commands', () => {
        const command = {
            auto_complete: false,
            description: 'Test for Slash Command',
            display_name: 'Send message to different channel via slash command',
            icon_url: '',
            method: 'P',
            team_id: testTeam.id,
            trigger: 'error_handling',
            url: `${Cypress.env().webhookBaseUrl}/send_message_to_channel?type=system_message&channel_id=${offTopicChannel.id}`,
            username: '',
        };
        cy.apiCreateCommand(command).then(({data: slashCommand}) => {
            cy.findByLabelText('off-topic public channel').should('exist');
            cy.uiGetPostTextBox().
                clear().
                type(`/${slashCommand.trigger} {enter}`);
            cy.findByText(`Command '${slashCommand.trigger}' failed to post response. Please contact your System Administrator.`).should('be.visible');
            cy.findByLabelText('off-topic public channel unread').
                should('exist').
                click();
            cy.uiWaitUntilMessagePostedIncludes('Hello World');
            cy.getLastPostId().then((postId) => {
                cy.get(`#postMessageText_${postId}`).should('be.visible').and('have.text', 'Hello World');
            });
            cy.getNthPostId(-2).then((postId) => {
                cy.get(`#postMessageText_${postId}`).should('be.visible').and('not.have.text', 'Extra response 2');
            });
        });
    });
    it('MM-T707 Send a message to a different channel than where the slash command was issued from', () => {
        const command = {
            auto_complete: false,
            description: 'Test for Slash Command',
            display_name: 'Send message to different channel via slash command',
            icon_url: '',
            method: 'P',
            team_id: testTeam.id,
            trigger: 'send_message_from_different_channel',
            url: `${Cypress.env().webhookBaseUrl}/send_message_to_channel?channel_id=${offTopicChannel.id}`,
            username: '',
        };
        cy.apiCreateCommand(command).then(({data: slashCommand}) => {
            cy.findByLabelText('off-topic public channel').should('exist');
            cy.postMessage(`/${slashCommand.trigger} `);
            cy.findByLabelText('off-topic public channel unread').
                should('exist').
                click();
            cy.uiWaitUntilMessagePostedIncludes('Hello World');
            cy.getLastPostId().then((postId) => {
                cy.get(`#postMessageText_${postId}`).should('be.visible').and('have.text', 'Hello World');
            });
            cy.getNthPostId(-2).then((postId) => {
                cy.get(`#postMessageText_${postId}`).should('be.visible').and('have.text', 'Extra response 2');
            });
        });
    });
});