import * as TIMEOUTS from '../../../fixtures/timeouts';
import {scrollToTop} from './helpers';
describe('unread_with_bottom_start_toast', () => {
    let otherUser;
    let testTeam;
    before(() => {
        cy.apiCreateUser().then(({user}) => {
            otherUser = user;
        });
        cy.apiInitSetup().then(({team, user}) => {
            testTeam = team;
            cy.apiAddUserToTeam(testTeam.id, otherUser.id);
            cy.apiLogin(user);
            cy.apiSaveUnreadScrollPositionPreference(user.id, 'start_from_newest');
        });
    });
    it('MM-T4873_1 Unread with bottom start toast is shown when visiting a channel with unreads and should disappear if scrolled to new messages indicator', () => {
        cy.apiCreateChannel(testTeam.id, 'channel-a', 'ChannelA').then(({channel}) => {
            cy.apiAddUserToChannel(channel.id, otherUser.id).then(() => {
                cy.visit(`/${testTeam.name}/channels/${channel.name}`);
                cy.get('#loadingSpinner').should('not.exist');
                cy.uiClickSidebarItem('off-topic');
                cy.postMessage('hi');
                for (let index = 0; index < 30; index++) {
                    cy.postMessageAs({sender: otherUser, message: `test message ${index}`, channelId: channel.id}).wait(50);
                }
                cy.postMessage('hello');
                cy.uiClickSidebarItem(channel.name).wait(TIMEOUTS.HALF_SEC);
                cy.get('div.post__content').contains('test message 29').should('be.visible');
                cy.get('div.toast').should('be.visible').contains('30 new messages');
                cy.get('.NotificationSeparator').should('exist').scrollIntoView({offset: {top: -150}});
                cy.get('div.toast__jump').should('not.exist');
                cy.get('div.toast').should('not.exist');
            });
        });
    });
    it('MM-T4873_2 Unread with bottom start toast should take to the new messages indicator when clicked', () => {
        cy.apiCreateChannel(testTeam.id, 'channel-b', 'ChannelB').then(({channel}) => {
            cy.apiAddUserToChannel(channel.id, otherUser.id).then(() => {
                cy.visit(`/${testTeam.name}/channels/${channel.name}`);
                cy.get('#loadingSpinner').should('not.exist');
                cy.uiClickSidebarItem('off-topic');
                cy.postMessage('hi');
                for (let index = 0; index < 30; index++) {
                    cy.postMessageAs({sender: otherUser, message: `test message ${index}`, channelId: channel.id}).wait(50);
                }
                cy.postMessage('hello');
                cy.uiClickSidebarItem(channel.name).wait(TIMEOUTS.HALF_SEC);
                cy.get('div.toast').should('be.visible').contains('30 new messages');
                cy.get('div.toast__visible div.toast__pointer').should('be.visible').click();
                cy.get('div.toast__jump').should('not.exist');
                cy.get('div.toast').should('not.exist');
                cy.get('.NotificationSeparator').should('be.visible');
            });
        });
    });
    it('MM-T4873_3 Unread with bottom start toast is shown when post is marked as unread', () => {
        cy.apiCreateChannel(testTeam.id, 'channel-c', 'ChannelC').then(({channel}) => {
            cy.apiAddUserToChannel(channel.id, otherUser.id).then(() => {
                cy.visit(`/${testTeam.name}/channels/${channel.name}`);
                for (let index = 0; index < 30; index++) {
                    cy.postMessageAs({sender: otherUser, message: `test message ${index}`, channelId: channel.id}).wait(50);
                }
                cy.uiClickSidebarItem('off-topic');
                cy.uiClickSidebarItem(channel.name);
                cy.wait(TIMEOUTS.ONE_SEC);
                scrollToTop();
                cy.getNthPostId(1).then((postId) => {
                    cy.uiClickPostDropdownMenu(postId, 'Mark as Unread');
                });
                cy.get('div.toast').should('be.visible').contains('30 new messages');
                cy.uiClickSidebarItem('off-topic');
                cy.uiClickSidebarItem(channel.name);
                cy.get('div.toast').should('be.visible').contains('30 new messages');
                cy.get('div.toast__visible div.toast__pointer').should('be.visible').click();
                cy.get('div.post__content').contains('test message 0').should('be.visible');
                cy.get('.NotificationSeparator').should('be.visible');
            });
        });
    });
});