import * as TIMEOUTS from '../../../fixtures/timeouts';
describe('Direct messages: redirections', () => {
    let testUser;
    let secondDMUser;
    let firstDMUser;
    let testTeam;
    let offTopicChannelUrl;
    before(() => {
        cy.apiInitSetup().then(({team, user}) => {
            testUser = user;
            testTeam = team;
            offTopicChannelUrl = `/${testTeam.name}/channels/off-topic`;
            cy.apiCreateUser().then(({user: createdUser}) => {
                firstDMUser = createdUser;
                cy.apiAddUserToTeam(testTeam.id, firstDMUser.id);
            });
            cy.apiCreateUser().then(({user: createdUser}) => {
                secondDMUser = createdUser;
                cy.apiAddUserToTeam(testTeam.id, secondDMUser.id);
            });
            cy.apiLogin(testUser);
            cy.visit(offTopicChannelUrl);
        });
    });
    it('MM-T453_1 Closing a direct message should redirect to town square channel', () => {
        sendDirectMessageToUser(firstDMUser, 'hi');
        closeDirectMessage(testUser, firstDMUser, testTeam);
        expectActiveChannelToBe('Town Square', `/${testTeam.name}/channels/town-square`);
        sendDirectMessageToUser(firstDMUser, 'hi again');
        cy.uiOpenChannelMenu('Close Direct Message');
        expectActiveChannelToBe('Town Square', `/${testTeam.name}/channels/town-square`);
    });
    it('MM-T453_2 Closing a different direct message should not affect active direct message', () => {
        sendDirectMessageToUser(firstDMUser, 'hi first');
        sendDirectMessageToUser(secondDMUser, 'hi second');
        closeDirectMessage(testUser, firstDMUser, testTeam);
        expectActiveChannelToBe(secondDMUser.username, `/messages/@${secondDMUser.username}`);
    });
    it('MM-T453_3 Changing URL to root url when viewing a direct message should redirect to direct message', () => {
        sendDirectMessageToUser(firstDMUser, 'hi');
        cy.visit('/');
        expectActiveChannelToBe(firstDMUser.username, `/messages/@${firstDMUser.username}`);
    });
});
const expectActiveChannelToBe = (title, url) => {
    cy.get('#channelHeaderTitle').
        should('be.visible').
        and('contain.text', title);
    cy.url().should('contain', url);
};
const sendDirectMessageToUser = (user, message) => {
    cy.uiAddDirectMessage().click();
    cy.get('#selectItems input').should('be.enabled').typeWithForce(`@${user.username}`).wait(TIMEOUTS.ONE_SEC);
    cy.get('#multiSelectList').
        should('be.visible').
        children().
        should('have.length', 1);
    cy.get('body').
        type('{downArrow}').
        type('{enter}');
    cy.get('#saveItems').click();
    cy.get('#channelHeaderTitle').should('be.visible').and('contain.text', user.username);
    cy.uiGetPostTextBox().
        type(message).
        type('{enter}');
};
const closeDirectMessage = (sender, recipient, team) => {
    cy.apiGetChannelsForUser(sender.id, team.id).then(({channels}) => {
        const channelDmWithFirstUser = channels.find((channel) =>
            channel.type === 'D' && channel.name.includes(recipient.id),
        );
        cy.uiGetChannelSidebarMenu(channelDmWithFirstUser.name, true).within(() => {
            cy.findByText('Close Conversation').click();
        });
    });
};