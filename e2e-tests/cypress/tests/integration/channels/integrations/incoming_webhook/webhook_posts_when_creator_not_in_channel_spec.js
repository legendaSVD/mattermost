import {getRandomId} from '../../../../utils';
describe('Integrations', () => {
    let testUser;
    let secondUser;
    let testTeam;
    let testChannel;
    let incomingWebhook;
    before(() => {
        cy.apiInitSetup().then(({user}) => {
            testUser = user;
            cy.apiCreateUser().then(({user: user2}) => {
                secondUser = user2;
            });
            cy.apiLogin(testUser).then(() => {
                cy.apiCreateTeam('test-team', 'Team Testers').then(({team}) => {
                    testTeam = team;
                    cy.apiAddUserToTeam(testTeam.id, secondUser.id);
                    cy.apiCreateChannel(testTeam.id, 'test-channel', 'Testers Channel').then(({channel}) => {
                        testChannel = channel;
                        const newIncomingHook = {
                            channel_id: testChannel.id,
                            channel_locked: true,
                            description: 'Test Webhook Description',
                            display_name: 'Test Webhook Name',
                        };
                        cy.apiCreateWebhook(newIncomingHook).then((hook) => {
                            incomingWebhook = hook;
                        });
                        cy.apiAddUserToChannel(testChannel.id, secondUser.id).then(() => {
                            cy.apiDeleteUserFromTeam(testTeam.id, testUser.id).then(({data}) => {
                                expect(data.status).to.equal('OK');
                            });
                            cy.apiLogin(secondUser);
                            cy.visit(`/${testTeam.name}/channels/${testChannel.name}`);
                        });
                    });
                });
            });
        });
    });
    it('MM-T638 Webhook posts when webhook creator is not a member of the channel', () => {
        const payload = getPayload(testChannel);
        cy.postIncomingWebhook({url: incomingWebhook.url, data: payload});
        cy.uiWaitUntilMessagePostedIncludes(payload.text);
        cy.getLastPostId().then((postId) => {
            cy.get(`#postMessageText_${postId}`).should('have.text', `${payload.text}`);
        });
    });
});
function getPayload(testChannel) {
    return {
        channel: testChannel.name,
        text: `${getRandomId()} - this webhook was set up by a user that is no longer in this channel`,
    };
}