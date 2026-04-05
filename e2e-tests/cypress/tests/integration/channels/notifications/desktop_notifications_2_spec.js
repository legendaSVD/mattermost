import {spyNotificationAs} from '../../../support/notification';
import {changeDesktopNotificationAs} from './helper';
describe('Desktop notifications', () => {
    let testTeam;
    let testChannel;
    let testUser;
    let otherUser;
    before(() => {
        cy.apiCreateUser().then(({user}) => {
            otherUser = user;
        });
        cy.apiInitSetup().then(({team, channel, user, offTopicUrl}) => {
            testUser = user;
            testTeam = team;
            testChannel = channel;
            cy.apiAddUserToTeam(testTeam.id, otherUser.id).then(() => {
                cy.apiAddUserToChannel(testChannel.id, otherUser.id);
            });
            cy.apiLogin(testUser);
            cy.visit(offTopicUrl);
        });
    });
    it('MM-T885 Channel notifications: Desktop notifications mentions only', () => {
        changeDesktopNotificationAs('all');
        const messageWithNotification = `random message with mention @${testUser.username}`;
        const expected = `@${otherUser.username}: ${messageWithNotification}`;
        cy.uiClickSidebarItem(testChannel.name);
        cy.uiOpenChannelMenu('Notification Preferences');
        cy.findByText('Desktop Notifications').should('be.visible');
        cy.findByRole('radio', {name: 'Mentions, direct messages, and keywords only'}).click().should('be.checked');
        cy.uiSave();
        cy.uiClickSidebarItem('off-topic');
        spyNotificationAs('withNotification', 'granted');
        cy.postMessageAs({sender: otherUser, message: 'random message no mention', channelId: testChannel.id});
        cy.get('@withNotification').should('not.have.been.called');
        cy.postMessageAs({sender: otherUser, message: messageWithNotification, channelId: testChannel.id});
        cy.get('@withNotification').should('have.been.calledWithMatch', testChannel.display_name, (args) => {
            expect(args.body, `Notification body: "${args.body}" should match: "${expected}"`).to.equal(expected);
            return true;
        });
        cy.uiGetSidebarItem(testChannel.name).find('.badge').should('exist').and('have.css', 'margin', '0px 4px');
    });
});