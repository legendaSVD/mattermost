import * as TIMEOUTS from '../../../fixtures/timeouts';
describe('Profile > Profile Settings', () => {
    let otherUser: Cypress.UserProfile;
    let testChannel: Cypress.Channel;
    before(() => {
        cy.apiInitSetup().then(({team, channel, offTopicUrl}) => {
            testChannel = channel;
            cy.apiCreateUser().then(({user}) => {
                otherUser = user;
                cy.apiAddUserToTeam(team.id, user.id).then(() => {
                    cy.apiAddUserToChannel(testChannel.id, user.id);
                });
            });
            cy.visit(offTopicUrl);
        });
    });
    it('MM-T285 Status Menu stays open', () => {
        cy.uiGetSetStatusButton().click();
        cy.uiGetStatusMenu();
        cy.postMessageAs({sender: otherUser, message: 'abc', channelId: testChannel.id}).wait(TIMEOUTS.FIVE_SEC);
        cy.uiGetStatusMenu();
    });
});