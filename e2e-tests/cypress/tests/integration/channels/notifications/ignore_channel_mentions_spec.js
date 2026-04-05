import * as TIMEOUTS from '../../../fixtures/timeouts';
describe('Notifications', () => {
    let testTeam;
    let userB;
    let channelA;
    let channelB;
    before(() => {
        cy.apiInitSetup().then(({team, user}) => {
            testTeam = team;
            cy.apiCreateUser().then(({user: newUser}) => {
                userB = newUser;
                cy.apiAddUserToTeam(testTeam.id, userB.id);
            });
            cy.apiCreateChannel(testTeam.id, 'channel-test', 'Channel').then(({channel}) => {
                channelA = channel;
            });
            cy.apiCreateChannel(testTeam.id, 'channel-test', 'Channel').then(({channel}) => {
                channelB = channel;
            });
            cy.apiLogin(user);
        });
    });
    it('MM-T567 - Channel Notifications - Turn on Ignore mentions for @channel, @here and @all', () => {
        cy.visit(`/${testTeam.name}/channels/${channelA.name}`);
        addNumberOfUsersToChannel(1);
        cy.getLastPostId().then((id) => {
            cy.get(`#postMessageText_${id}`).should('contain', 'added to the channel by you');
        });
        setIgnoreMentions(true);
        cy.visit(`/${testTeam.name}/channels/${channelB.name}`);
        cy.postMessageAs({sender: userB, message: '@all test', channelId: channelA.id});
        cy.postMessageAs({sender: userB, message: '@channel test', channelId: channelA.id});
        cy.postMessageAs({sender: userB, message: '@here test', channelId: channelA.id});
        cy.get(`#sidebarItem_${channelA.name}`).wait(TIMEOUTS.ONE_SEC).should('have.class', 'unread-title');
        cy.get(`#sidebarItem_${channelA.name} > #unreadMentions`).should('not.exist');
    });
    it('MM-T568 - Channel Notifications - Turn off Ignore mentions for @channel, @here and @all', () => {
        cy.visit(`/${testTeam.name}/channels/${channelA.name}`);
        setIgnoreMentions(false);
        cy.visit(`/${testTeam.name}/channels/${channelB.name}`);
        cy.postMessageAs({sender: userB, message: '@all test', channelId: channelA.id});
        cy.postMessageAs({sender: userB, message: '@channel test', channelId: channelA.id});
        cy.postMessageAs({sender: userB, message: '@here test', channelId: channelA.id});
        cy.get(`#sidebarItem_${channelA.name}`).should('have.class', 'unread-title');
        cy.get(`#sidebarItem_${channelA.name} > #unreadMentions`).should('exist').wait(TIMEOUTS.ONE_SEC).should('contain', '3');
    });
});
function addNumberOfUsersToChannel(num = 1) {
    cy.uiOpenChannelMenu('Add Members');
    cy.get('#addUsersToChannelModal').should('be.visible');
    Cypress._.times(num, () => {
        cy.get('#selectItems input').typeWithForce('u');
        cy.get('#multiSelectList').should('be.visible').children().first().click();
    });
    cy.get('#saveItems').click();
    cy.get('#addUsersToChannelModal').should('not.exist');
}
function setIgnoreMentions(toSet) {
    cy.uiOpenChannelMenu('Notification Preferences');
    cy.findByText('Mute or ignore').should('be.visible');
    cy.findByRole('checkbox', {name: 'Ignore mentions for @channel, @here and @all'}).click().should(toSet ? 'be.checked' : 'not.be.checked');
    cy.uiSave();
}