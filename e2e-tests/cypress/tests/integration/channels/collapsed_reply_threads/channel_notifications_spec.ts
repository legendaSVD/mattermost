import {Team} from '@mattermost/types/teams';
import {UserProfile} from '@mattermost/types/users';
import {PostMessageResp} from '../../../support/task_commands';
import {spyNotificationAs} from '../../../support/notification';
describe('CRT Desktop notifications', () => {
    let testTeam: Team;
    let testChannelUrl: string;
    let testChannelId: string;
    let testChannelName: string;
    let receiver: UserProfile;
    let sender: UserProfile;
    before(() => {
        cy.apiUpdateConfig({
            ServiceSettings: {
                ThreadAutoFollow: true,
                CollapsedThreads: 'default_on',
            },
        });
        cy.apiCreateUser().then(({user}) => {
            sender = user;
        });
        cy.apiInitSetup().then(({team, channel, user, channelUrl}) => {
            testTeam = team;
            receiver = user;
            testChannelUrl = channelUrl;
            testChannelId = channel.id;
            testChannelName = channel.display_name;
            cy.apiAddUserToTeam(testTeam.id, sender.id).then(() => {
                cy.apiAddUserToChannel(testChannelId, sender.id);
            });
            cy.apiLogin(receiver);
        });
    });
    it('MM-T4417_1 Trigger notifications on all replies when channel setting is checked', () => {
        cy.visit(testChannelUrl);
        cy.uiOpenChannelMenu('Notification Preferences');
        cy.findByText('Mute channel').should('be.visible').click({force: true});
        cy.findByText('This channel is muted').should('be.visible');
        cy.findByText('Save').should('be.visible').click();
        spyNotificationAs('notifySpy', 'granted');
        cy.uiOpenChannelMenu('Notification Preferences');
        cy.findByText('Mute channel').should('be.visible').click({force: true});
        cy.findByText('Desktop Notifications').should('be.visible');
        cy.get('.channel-notifications-settings-modal__body').scrollTo('center').get('#desktopNotification-all').should('be.visible').click();
        cy.get('.channel-notifications-settings-modal__body').get('#desktopNotification-all').should('be.checked');
        cy.get('#desktopNotification-mention').should('be.visible').click().then(() => {
            cy.get('[data-testid="desktopReplyThreads"]').should('be.checked');
            cy.get('[data-testid="desktopReplyThreads"]').should('be.visible').click();
            cy.get('[data-testid="desktopReplyThreads"]').should('not.be.checked');
        });
        cy.get('.channel-notifications-settings-modal__body').scrollTo('center').get('#desktopNotification-mention').should('be.checked');
        cy.get('.channel-notifications-settings-modal__body').scrollTo('center').get('#desktopNotification-none').should('be.visible').click();
        cy.get('.channel-notifications-settings-modal__body').get('#desktopNotification-none').should('be.checked');
        cy.findByText('Save').should('be.visible').click();
        cy.uiOpenChannelMenu('Notification Preferences');
        cy.get('.channel-notifications-settings-modal__body').scrollTo('center').get('#desktopNotification-none').should('be.checked');
        cy.get('.channel-notifications-settings-modal__body').get('#desktopNotification-all').scrollIntoView().should('be.visible').click();
        cy.findByText('Save').should('be.visible').click();
        cy.postMessageAs({sender, message: 'This is a not followed root message', channelId: testChannelId, rootId: ''}).then(({id: postId}) => {
            cy.uiClickSidebarItem('town-square');
            cy.postMessageAs({sender, message: 'This is a reply to the unfollowed thread', channelId: testChannelId, rootId: postId});
            cy.get('@notifySpy').should('not.be.called');
        });
        cy.visit(testChannelUrl);
        spyNotificationAs('notifySpy', 'granted');
        cy.postMessage('Hi there, this is a root message');
        cy.getLastPostId().then((postId) => {
            cy.uiClickSidebarItem('town-square');
            const message = 'This is a reply to the root post';
            cy.postMessageAs({sender, message, channelId: testChannelId, rootId: postId});
            cy.get('@notifySpy').should('have.been.calledWithMatch', `Reply in ${testChannelName}`, (args) => {
                expect(args.body, `Notification body: "${args.body}" should match: "${message}"`).to.equal(`@${sender.username}: ${message}`);
                return true;
            });
            cy.apiDeletePost(postId);
        });
    });
    it('MM-T4417_2 Click on sameMobileSettingsDesktop and check if additional settings still appears', () => {
        cy.visit(testChannelUrl);
        cy.uiOpenChannelMenu('Notification Preferences');
        cy.get('[data-testid="sameMobileSettingsDesktop"]').scrollIntoView().should('be.checked');
        cy.get('[data-testid="mobile-notify-me-radio-section"]').should('not.exist');
        cy.get('[data-testid="sameMobileSettingsDesktop"]').scrollIntoView().should('be.visible').click();
        cy.get('[data-testid="mobile-notify-me-radio-section"]').should('be.visible').scrollIntoView().within(() => {
            cy.findByText('Notify me about…').should('be.visible');
            cy.get('[data-testid="MobileNotification-mention"]').should('be.visible').click();
        });
        cy.get('[data-testid="mobile-reply-threads-checkbox-section"]').should('be.visible').scrollIntoView().within(() => {
            cy.findByText('Notify me about replies to threads I’m following').should('be.visible');
        });
        cy.get('body').type('{esc}');
    });
    it('MM-T4417_3 Trigger notifications only on mention replies when channel setting is unchecked', () => {
        cy.visit(testChannelUrl);
        spyNotificationAs('notifySpy1', 'granted');
        cy.uiOpenChannelMenu('Notification Preferences');
        cy.get('#desktopNotification-mention').scrollIntoView().should('be.visible').click();
        cy.get('[data-testid="desktopReplyThreads"]').scrollIntoView().should('be.visible').then(($el) => {
            if ($el.is(':checked')) {
                cy.wrap($el).click();
            }
        });
        cy.get('[data-testid="desktopNotificationSoundsCheckbox"]').scrollIntoView().should('be.visible').then(($el) => {
            if (!$el.is(':checked')) {
                cy.wrap($el).click();
            }
        });
        cy.get('#desktopNotificationSoundsSelect').scrollIntoView().should('be.visible').click();
        cy.findByText('Crackle').should('be.visible').click();
        cy.findByText('Save').should('be.visible').click();
        cy.visit(`/${testTeam.name}/channels/town-square`);
        cy.postMessageAs({sender, message: 'This is the root message which will not have a at-mention in thread', channelId: testChannelId, rootId: ''}).then(({id: postId}) => {
            cy.postMessageAs({sender, message: 'Reply without at-mention', channelId: testChannelId, rootId: postId}).then(() => {
                cy.get('@notifySpy1').should('not.be.called');
            });
            cy.apiDeletePost(postId);
        });
        spyNotificationAs('notifySpy2', 'granted');
        cy.postMessageAs({sender, message: 'This is another root message which will have a at-mention in thread', channelId: testChannelId, rootId: ''}).then(({id: postId}) => {
            const message = `Reply with at-mention @${receiver.username}`;
            cy.postMessageAs({sender, message, channelId: testChannelId, rootId: postId});
            cy.get('@notifySpy2').should('have.been.calledWithMatch', `Reply in ${testChannelName}`, (args) => {
                expect(args.body, `Notification body: "${args.body}" should match: "${message}"`).to.equal(`@${sender.username}: ${message}`);
                return true;
            });
            cy.apiDeletePost(postId);
        });
    });
    it('When a reply is deleted in open channel, the notification should be cleared', () => {
        cy.visit(testChannelUrl);
        cy.postMessageAs({sender, message: 'a thread', channelId: testChannelId, rootId: ''});
        cy.getLastPostId().then((postId) => {
            cy.postMessageAs({sender: receiver, message: 'following the thread', channelId: testChannelId, rootId: postId});
            cy.postMessageAs({sender, message: 'a reply', channelId: testChannelId, rootId: postId}).as('reply');
            cy.postMessageAs({sender, message: `@${receiver.username} mention reply`, channelId: testChannelId, rootId: postId}).
                as('replyMention');
            cy.get('#sidebarItem_threads #unreadMentions').should('exist').and('have.text', '1');
            const replies = ['@reply', '@replyMention'];
            for (const reply of replies) {
                cy.get<PostMessageResp>(reply).then(({id}) => {
                    cy.apiDeletePost(id);
                });
            }
            cy.get('#sidebarItem_threads #unreadMentions').should('not.exist');
            cy.apiDeletePost(postId);
        });
    });
    it('When a reply is deleted in DM channel, the notification should be cleared', () => {
        cy.apiCreateDirectChannel([receiver.id, sender.id]).then(({channel: dmChannel}) => {
            cy.visit(`/${testTeam.name}/messages/@${sender.username}`);
            cy.postMessageAs({sender, message: 'a thread', channelId: dmChannel.id, rootId: ''}).as('rootPost');
            cy.get<PostMessageResp>('@rootPost').then(({id: rootId}) => {
                cy.postMessageAs({sender: receiver, message: 'following the thread', channelId: dmChannel.id, rootId});
                cy.postMessageAs({sender, message: 'a reply', channelId: dmChannel.id, rootId}).as('reply');
                cy.postMessageAs({sender, message: `@${receiver.username} mention reply`, channelId: dmChannel.id, rootId}).
                    as('replyMention');
                cy.get('#sidebarItem_threads #unreadMentions').should('exist');
                const replies = ['@reply', '@replyMention'];
                for (const reply of replies) {
                    cy.get<PostMessageResp>(reply).then(({id}) => {
                        cy.apiDeletePost(id);
                    });
                }
                cy.get('#sidebarItem_threads #unreadMentions').should('not.exist');
                cy.apiDeletePost(rootId);
            });
        });
    });
});