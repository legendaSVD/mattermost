import * as MESSAGES from '../../../fixtures/messages';
import * as TIMEOUTS from '../../../fixtures/timeouts';
import {spyNotificationAs} from '../../../support/notification';
import {
    changeDesktopNotificationAs,
    changeTeammateNameDisplayAs,
} from './helper';
describe('Desktop notifications', () => {
    let testTeam;
    let testUser;
    let otherUser;
    before(() => {
        cy.apiInitSetup().then(({team, user}) => {
            otherUser = user;
            testTeam = team;
        });
    });
    beforeEach(() => {
        cy.apiAdminLogin();
        cy.apiCreateUser().then(({user}) => {
            testUser = user;
            cy.apiAddUserToTeam(testTeam.id, testUser.id);
            cy.apiLogin(testUser);
            cy.visit(`/${testTeam.name}/channels/town-square`);
        });
    });
    it('MM-T482 Desktop Notifications - (at) here not rec\'d when logged off', () => {
        spyNotificationAs('withoutNotification', 'granted');
        changeDesktopNotificationAs('mentions');
        cy.apiGetChannelByName(testTeam.name, 'Off-Topic').then(({channel}) => {
            cy.uiLogout();
            cy.postMessageAs({sender: otherUser, message: '@here', channelId: channel.id});
        });
        cy.apiLogin(testUser);
        cy.visit(`/${testTeam.name}/channels/town-square`);
        cy.get('@withoutNotification').should('not.have.been.called');
        cy.get('#sidebarItem_off-topic').
            scrollIntoView().
            find('#unreadMentions').
            should('not.exist');
        cy.findByLabelText('off-topic public channel unread').
            should('exist').
            click();
        cy.getLastPostId().then((postId) => {
            cy.get(`#postMessageText_${postId}`).as('postMessageText');
        });
        cy.get('@postMessageText').
            find('[data-mention="here"]').
            should('exist');
        cy.getRecentEmail(testUser).then((data) => {
            expect(data.subject).to.contain('You joined');
        });
    });
    it('MM-T487 Desktop Notifications - For all activity with apostrophe, emoji, and markdown in notification', () => {
        spyNotificationAs('withNotification', 'granted');
        const actualMsg = '*I\'m* [hungry](http://example.com) :taco: ![Mattermost](https://mattermost.com/wp-content/uploads/2022/02/logoHorizontal.png)';
        const expected = '@' + otherUser.username + ': I\'m hungry :taco: Mattermost';
        changeDesktopNotificationAs('all');
        cy.apiGetChannelByName(testTeam.name, 'Off-Topic').then(({channel}) => {
            cy.postMessageAs({sender: otherUser, message: actualMsg, channelId: channel.id});
            cy.wait(TIMEOUTS.HALF_SEC);
            cy.get('@withNotification').should('have.been.calledWithMatch', 'Off-Topic', (args) => {
                expect(args.body, `Notification body: "${args.body}" should match: "${expected}"`).to.equal(expected);
                return true;
            });
        });
    });
    it.skip('MM-T495 Desktop Notifications - Can set to DND and no notification fires on DM', () => {
        cy.apiCreateDirectChannel([otherUser.id, testUser.id]).then(({channel}) => {
            cy.apiPatchUser(testUser.id, {notify_props: {...testUser.notify_props, desktop: 'all'}});
            spyNotificationAs('withoutNotification', 'granted');
            cy.uiGetPostTextBox().clear().type('/dnd{enter}');
            cy.postMessageAs({sender: otherUser, message: MESSAGES.TINY, channelId: channel.id});
            cy.wait(TIMEOUTS.HALF_SEC);
            cy.get('@withoutNotification').should('not.have.been.called');
            cy.uiGetSetStatusButton().
                find('.icon-minus-circle').
                should('be.visible');
        });
    });
    it('MM-T497 Desktop Notifications for empty string without mention badge', () => {
        spyNotificationAs('withNotification', 'granted');
        const actualMsg = '---';
        const expected = '@' + otherUser.username + ' posted a message';
        changeDesktopNotificationAs('all');
        cy.apiGetChannelByName(testTeam.name, 'Off-Topic').then(({channel}) => {
            cy.postMessageAs({sender: otherUser, message: actualMsg, channelId: channel.id});
            cy.wait(TIMEOUTS.HALF_SEC);
            cy.get('@withNotification').should('have.been.calledWithMatch', 'Off-Topic', (args) => {
                expect(args.body, `Notification body: "${args.body}" should match: "${expected}"`).to.equal(expected);
                return true;
            });
            cy.get(`#sidebarItem_${channel.name} .badge`).should('not.exist');
        });
    });
    it('MM-T488 Desktop Notifications - Teammate name display set to username', () => {
        spyNotificationAs('withNotification', 'granted');
        changeDesktopNotificationAs('mentions');
        changeTeammateNameDisplayAs('#name_formatFormatA');
        const actualMsg = `@${testUser.username} How are things?`;
        const expected = `@${otherUser.username}: @${testUser.username} How are things?`;
        cy.apiGetChannelByName(testTeam.name, 'Off-Topic').then(({channel}) => {
            cy.postMessageAs({sender: otherUser, message: actualMsg, channelId: channel.id});
            cy.wait(TIMEOUTS.HALF_SEC);
            cy.get('@withNotification').should('have.been.calledWithMatch', 'Off-Topic', (args) => {
                expect(args.body, `Notification body: "${args.body}" should match: "${expected}"`).to.equal(expected);
                return true;
            });
        });
    });
    it('MM-T490 Desktop Notifications - Teammate name display set to first and last name', () => {
        spyNotificationAs('withNotification', 'granted');
        changeDesktopNotificationAs('mentions');
        changeTeammateNameDisplayAs('#name_formatFormatC');
        const actualMsg = `@${testUser.username} How are things?`;
        const expected = `@${otherUser.first_name} ${otherUser.last_name}: @${testUser.username} How are things?`;
        cy.apiGetChannelByName(testTeam.name, 'Off-Topic').then(({channel}) => {
            cy.postMessageAs({sender: otherUser, message: actualMsg, channelId: channel.id});
            cy.wait(TIMEOUTS.HALF_SEC);
            cy.get('@withNotification').should('have.been.calledWithMatch', 'Off-Topic', (args) => {
                expect(args.body, `Notification body: "${args.body}" should match: "${expected}"`).to.equal(expected);
                return true;
            });
        });
    });
    it('MM-T491 - Channel notifications: No desktop notification when in focus', () => {
        cy.apiGetChannelByName(testTeam.name, 'Off-Topic').then(({channel}) => {
            const message = '/echo test 3';
            cy.visit(`/${testTeam.name}/channels/${channel.name}`);
            spyNotificationAs('withNotification', 'granted');
            cy.postMessageAs({sender: otherUser, message, channelId: channel.id});
            cy.get('@withNotification').should('not.have.been.called');
        });
    });
    it('MM-T494 - Channel notifications: Send Desktop Notifications - Only mentions and DMs', () => {
        spyNotificationAs('withNotification', 'granted');
        changeDesktopNotificationAs('mentions');
        cy.apiGetChannelByName(testTeam.name, 'Off-Topic').then(({channel}) => {
            const messageWithoutNotification = 'message without notification';
            const messageWithNotification = `random message with mention @${testUser.username}`;
            const expected = `@${otherUser.username}: ${messageWithNotification}`;
            cy.postMessageAs({sender: otherUser, message: messageWithoutNotification, channelId: channel.id});
            cy.get('@withNotification').should('not.have.been.called');
            cy.postMessageAs({sender: otherUser, message: messageWithNotification, channelId: channel.id});
            cy.get('@withNotification').should('have.been.calledWithMatch', 'Off-Topic', (args) => {
                expect(args.body, `Notification body: "${args.body}" should match: "${expected}"`).to.equal(expected);
                return true;
            });
            cy.apiCreateDirectChannel([testUser.id, otherUser.id]).then(({channel: dmChannel}) => {
                cy.postMessageAs({sender: otherUser, message: 'hi', channelId: dmChannel.id});
                cy.get('@withNotification').should('have.been.called');
            });
        });
    });
    it('MM-T496 - Channel notifications: Send Desktop Notifications - Never', () => {
        spyNotificationAs('withNotification', 'granted');
        changeDesktopNotificationAs('nothing');
        cy.apiGetChannelByName(testTeam.name, 'Off-Topic').then(({channel}) => {
            const messageWithNotification = `random message with mention @${testUser.username}`;
            cy.postMessageAs({sender: otherUser, message: messageWithNotification, channelId: channel.id});
            cy.get('@withNotification').should('not.have.been.called');
            cy.apiCreateDirectChannel([testUser.id, otherUser.id]).then(({channel: dmChannel}) => {
                cy.postMessageAs({sender: otherUser, message: 'hi', channelId: dmChannel.id});
                cy.get('@withNotification').should('not.have.been.called');
            });
        });
    });
    it('MM-T499 - Channel notifications: Desktop Notification Sounds OFF', () => {
        spyNotificationAs('withNotification', 'granted');
        cy.uiOpenSettingsModal().within(() => {
            cy.findByText('Desktop notification sounds').should('be.visible').click();
            cy.findByText('Message notification sound').click({force: true});
            cy.uiSaveAndClose();
        });
        cy.apiGetChannelByName(testTeam.name, 'Off-Topic').then(({channel}) => {
            const messageWithNotification = `random message with mention @${testUser.username}`;
            cy.postMessageAs({sender: otherUser, message: messageWithNotification, channelId: channel.id});
            cy.get('@withNotification').should('have.been.calledWithMatch', 'Off-Topic', (args) => {
                expect(args.silent).to.equal(true);
                return true;
            });
        });
    });
});