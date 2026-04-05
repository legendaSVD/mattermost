import * as TIMEOUTS from '../../../fixtures/timeouts';
import {
    scrollDown,
    scrollUp,
    scrollUpAndPostAMessage,
} from './helpers';
describe('toasts', () => {
    let otherUser;
    let testTeam;
    let testChannelId;
    let testChannelName;
    let otherChannel;
    before(() => {
        cy.apiCreateUser().then(({user}) => {
            otherUser = user;
        });
        cy.apiInitSetup().then(({team, channel, user, channelUrl}) => {
            testTeam = team;
            otherChannel = channel;
            testChannelName = channel.name;
            testChannelId = channel.id;
            cy.apiAddUserToTeam(testTeam.id, otherUser.id).then(() => {
                cy.apiAddUserToChannel(testChannelId, otherUser.id).then(() => {
                    cy.apiLogin(user);
                    cy.visit(channelUrl);
                });
            });
        });
    });
    beforeEach(() => {
        cy.uiClickSidebarItem(testChannelName);
        cy.uiClickSidebarItem('off-topic');
    });
    it('Unread messages toast is shown when visiting a channel with unreads and should disappear if scrolled to bottom', () => {
        for (let index = 0; index < 30; index++) {
            cy.postMessageAs({sender: otherUser, message: `This is an old message [${index}]`, channelId: testChannelId});
        }
        cy.uiClickSidebarItem(testChannelName);
        cy.get('div.toast').should('be.visible').contains('30 new messages');
        scrollDown();
        cy.get('div.toast__jump').should('not.exist');
        cy.get('div.toast').should('not.exist');
    });
    it('Should show new message indicator when posts arrive and user is not at bottom', () => {
        cy.uiClickSidebarItem(testChannelName);
        scrollUpAndPostAMessage(otherUser, testChannelId);
        cy.get('div.toast').should('be.visible').contains('1 new message');
    });
    it('New message toast should not have action button when at bottom and hide toast in a sec', () => {
        cy.uiClickSidebarItem(testChannelName);
        scrollUpAndPostAMessage(otherUser, testChannelId);
        cy.get('div.toast').should('be.visible');
        scrollDown();
        cy.get('div.toast__jump').should('not.exist');
        cy.get('div.toast').should('not.exist');
    });
    it('New message toast should take to new messages line when clicked', () => {
        cy.uiClickSidebarItem(testChannelName);
        scrollUp();
        for (let index = 0; index < 4; index++) {
            cy.postMessageAs({sender: otherUser, message: `This is a new message [${index}]`, channelId: testChannelId});
        }
        cy.get('.NotificationSeparator').should('not.exist');
        cy.get('div.toast__visible div.toast__pointer').should('be.visible').click();
        cy.get('.NotificationSeparator').should('be.visible');
    });
    it('Unread messages toast should take to bottom when clicked', () => {
        cy.uiClickSidebarItem(testChannelName);
        scrollUp();
        for (let index = 0; index < 10; index++) {
            cy.postMessageAs({sender: otherUser, message: `This is a message for checking action on toast [${index}]`, channelId: testChannelId});
        }
        cy.get('div.toast').should('be.visible');
        cy.get('div.toast__visible div.toast__pointer').should('be.visible').click();
        cy.getLastPostId().then((postId) => {
            cy.get(`#postMessageText_${postId} > p`).should('be.visible').contains('This is a message for checking action on toast [9]');
        });
    });
    it('New message toast should be removed on clicking remove button', () => {
        cy.uiClickSidebarItem(testChannelName);
        scrollUpAndPostAMessage(otherUser, testChannelId);
        cy.get('div.toast').should('be.visible');
        cy.findByTestId('dismissToast').should('be.visible').click();
        cy.get('div.toast').should('not.exist');
    });
    it('Recurring visit to a channel with unreads should have unread toast', () => {
        cy.uiClickSidebarItem(testChannelName);
        scrollUp();
        cy.get('#sidebarItem_off-topic').should('be.visible').scrollIntoView().click();
        for (let index = 0; index < 40; index++) {
            cy.postMessageAs({sender: otherUser, message: `This is a new message [${index}]`, channelId: testChannelId});
        }
        cy.go('back');
        scrollUp();
        cy.get('div.toast').should('be.visible');
        cy.findByTestId('dismissToast').should('be.visible').click();
        cy.get('div.toast').should('not.exist');
    });
    it('New message count should increase with incoming messages', () => {
        cy.uiClickSidebarItem(testChannelName);
        scrollUpAndPostAMessage(otherUser, testChannelId);
        cy.get('div.toast').should('be.visible').contains('1 new message');
        cy.postMessageAs({sender: otherUser, message: 'This is another new message', channelId: testChannelId}).then(() => {
            cy.get('div.toast').should('be.visible').contains('2 new message');
        });
    });
    it('New message count should reset when dismissed', () => {
        cy.uiClickSidebarItem(testChannelName);
        scrollUpAndPostAMessage(otherUser, testChannelId);
        cy.get('div.toast').should('be.visible').contains('1 new message');
        cy.findByTestId('dismissToast').should('be.visible').click();
        cy.get('div.toast').should('not.exist');
        cy.postMessageAs({sender: otherUser, message: 'This is another new message', channelId: testChannelId}).then(() => {
            cy.get('div.toast').should('be.visible').contains('1 new message');
        });
    });
    it('Marking channel as unread should make unread toast appear', () => {
        cy.uiClickSidebarItem(testChannelName);
        scrollUp();
        cy.getNthPostId(40).then((postId) => {
            cy.uiClickPostDropdownMenu(postId, 'Mark as Unread');
            cy.uiClickSidebarItem('off-topic');
            cy.get('div.post-list__dynamic').should('be.visible');
            cy.uiClickSidebarItem(testChannelName);
            scrollUp();
            cy.get('div.toast').should('be.visible').contains('new messages today');
        });
    });
    it('New message line should move if user is scrolled up and new messages arrive', () => {
        cy.uiClickSidebarItem(testChannelName);
        scrollDown();
        cy.postMessageAs({sender: otherUser, message: 'post1', channelId: testChannelId}).then(() => {
            cy.get('.NotificationSeparator').should('exist').parent().parent().parent().next().should('contain', 'post1');
            scrollUp();
            cy.postMessageAs({sender: otherUser, message: 'post2', channelId: testChannelId}).then(() => {
                cy.get('.NotificationSeparator').parent().parent().parent().next().should('contain', 'post2');
            });
        });
    });
    it('Archive toast is not shown when visiting a permalink at the bottom', () => {
        cy.postMessageAs({sender: otherUser, message: 'This is a message for permalink', channelId: testChannelId}).then(({id}) => {
            cy.uiClickSidebarItem(testChannelName);
            cy.visit(`/${testTeam.name}/pl/${id}`);
            cy.findAllByTestId('postView').should('be.visible');
            cy.get('div.toast').should('not.exist');
        });
    });
    it('Archive toast should be shown when visiting a post which is not at bottom', () => {
        cy.apiCreateChannel(testTeam.id, 'channel-test', 'Channel').then(({channel}) => {
            const otherChannelId = channel.id;
            cy.apiAddUserToChannel(otherChannelId, otherUser.id);
            cy.postMessageAs({sender: otherUser, message: 'This is a message for permalink', channelId: otherChannelId}).then(({id}) => {
                cy.uiClickSidebarItem(testChannelName);
                for (let index = 0; index < 25; index++) {
                    cy.postMessageAs({sender: otherUser, message: `# This is an old message [${index}]`, channelId: otherChannelId});
                }
                cy.visit(`/${testTeam.name}/pl/${id}`);
                cy.findAllByTestId('postView').should('be.visible');
                cy.get('div.toast').should('be.visible').contains('Viewing message history');
            });
        });
    });
    it('MM-T1787 Toast does not appear when all new messages are visible without scrolling down', () => {
        cy.get(`#sidebarItem_${otherChannel.name}`).should('be.visible').click();
        for (let index = 0; index < 30; index++) {
            cy.postMessageAs({sender: otherUser, message: `This is an old message [${index}]`, channelId: testChannelId});
        }
        cy.uiClickSidebarItem(testChannelName);
        cy.get('div.post-list__dynamic').should('be.visible').scrollTo('bottom', {duration: TIMEOUTS.ONE_SEC});
        cy.uiClickSidebarItem(otherChannel.name);
        cy.postMessageAs({sender: otherUser, message: 'This is an new message 1', channelId: testChannelId});
        cy.postMessageAs({sender: otherUser, message: 'This is an new message 2', channelId: testChannelId});
        cy.uiClickSidebarItem(testChannelName);
        cy.get('div.toast').should('not.exist');
        Cypress._.times(3, () => {
            cy.get('div.post-list__dynamic').should('be.visible').scrollTo('top', {duration: TIMEOUTS.ONE_SEC}).wait(TIMEOUTS.ONE_SEC);
        });
        cy.get('#channelIntro').contains('Beginning of');
        cy.get('div.toast').should('not.exist');
    });
    it('MM-T1785 Toast - When marking post as unread', () => {
        cy.uiClickSidebarItem(testChannelName);
        for (let index = 0; index < 30; index++) {
            cy.postMessageAs({sender: otherUser, message: `This is an old message [${index}]`, channelId: testChannelId});
        }
        cy.getNthPostId(2).then((postId) => {
            cy.uiClickPostDropdownMenu(postId, 'Mark as Unread');
        });
        cy.get('div.toast').should('be.visible').contains('new messages');
        cy.get('div.post-list__dynamic').should('be.visible').scrollTo('bottom', {duration: TIMEOUTS.ONE_SEC});
        cy.getNthPostId(-2).then((postId) => {
            cy.uiClickPostDropdownMenu(postId, 'Mark as Unread');
        });
        cy.get('div.toast').should('not.exist');
        cy.reload();
    });
    it('MM-T1788 Toast count', () => {
        cy.uiClickSidebarItem(otherChannel.name);
        for (let index = 0; index < 25; index++) {
            cy.postMessageAs({sender: otherUser, message: `This is an old message [${index}]`, channelId: testChannelId});
        }
        cy.uiClickSidebarItem(testChannelName);
        cy.get('div.toast').should('be.visible').contains('25 new messages');
        const initialCount = 25;
        Cypress._.times(10, (num) => {
            cy.postMessageAs({sender: otherUser, message: `This is an old message [${initialCount + num}]`, channelId: testChannelId});
            cy.get('div.toast').should('be.visible').contains(`${initialCount + num + 1} new messages`);
        });
    });
});