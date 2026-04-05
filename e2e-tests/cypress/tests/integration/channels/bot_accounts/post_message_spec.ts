import {Channel} from '@mattermost/types/channels';
describe('Bot post message', () => {
    let offTopicChannel: Channel;
    before(() => {
        cy.apiInitSetup().then(({team}) => {
            cy.apiGetChannelByName(team.name, 'off-topic').then(({channel}) => {
                offTopicChannel = channel;
            });
            cy.visit(`/${team.name}/channels/off-topic`);
        });
    });
    it('MM-T1812 Post as a bot when personal access tokens are false', () => {
        cy.apiCreateBot().then(({bot}) => {
            const botUserId = bot.user_id;
            const message = 'This is a message from a bot.';
            cy.apiAccessToken(botUserId, 'Create token').then(({token}) => {
                cy.apiAddUserToTeam(offTopicChannel.team_id, botUserId);
                const props = {attachments: [{pretext: 'Some Pretext', text: 'Some Text'}]};
                cy.postBotMessage({token, message, props, channelId: offTopicChannel.id}).
                    its('id').
                    should('exist').
                    as('botPost');
                cy.uiWaitUntilMessagePostedIncludes(message);
                cy.get('@botPost').then((postId) => {
                    cy.get(`#postMessageText_${postId}`).
                        should('be.visible').
                        and('have.text', message);
                });
            });
        });
    });
});