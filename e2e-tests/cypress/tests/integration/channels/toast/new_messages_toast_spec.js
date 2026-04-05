import {getRandomId} from '../../../utils';
import * as TIMEOUTS from '../../../fixtures/timeouts';
import {
    scrollDown,
    scrollUp,
    scrollUpAndPostAMessage,
} from './helpers';
describe('Toast', () => {
    let otherUser;
    let testTeam;
    let testChannelId;
    let testChannelName;
    before(() => {
        cy.apiCreateUser().then(({user}) => {
            otherUser = user;
        });
        cy.apiInitSetup().then(({team, channel, user, channelUrl}) => {
            testTeam = team;
            testChannelId = channel.id;
            testChannelName = channel.name;
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
        cy.postMessage('This is Testing');
        cy.uiClickSidebarItem('off-topic');
    });
    it('MM-T1784_1 should see a toast with Jump to recent messages button', () => {
        const randomId = getRandomId();
        const numberOfPost = 30;
        Cypress._.times(numberOfPost, (num) => {
            cy.postMessageAs({sender: otherUser, message: `${num} ${randomId}`, channelId: testChannelId});
        });
        cy.wait(TIMEOUTS.ONE_SEC);
        cy.uiClickSidebarItem(testChannelName);
        cy.get('div.toast').should('be.visible');
        cy.get('div.toast__jump').should('be.visible');
        cy.get('div.toast__message>span').should('be.visible').first().contains(`${numberOfPost} new messages`);
        scrollDown();
        cy.get('div.toast__jump').should('not.exist');
        cy.get('div.toast').should('not.exist');
    });
    it('MM-T1784_2 should see a toast with number of unread messages in the toast if the bottom is not in view', () => {
        cy.uiClickSidebarItem(testChannelName);
        const numberOfPost = 2;
        scrollUpAndPostAMessage(otherUser, testChannelId, numberOfPost);
        cy.get('div.toast').should('be.visible');
        cy.get('div.toast__message>span').should('be.visible').first().contains(`${numberOfPost} new messages`);
    });
    it('MM-T1784_3 should show the mobile view version of the toast', () => {
        cy.uiClickSidebarItem(testChannelName);
        const numberOfPost = 2;
        scrollUpAndPostAMessage(otherUser, testChannelId, numberOfPost);
        cy.get('div.toast').should('be.visible');
        cy.get('.toast__visible').should('be.visible').within(() => {
            cy.get('.toast__jump').findAllByLabelText('Down Arrow Icon').should('be.visible');
            cy.findByText('Jump to new messages').should('be.visible');
            cy.get('.toast__message>span').should('be.visible').first().contains(`${numberOfPost} new messages today`).find('time').should('be.visible');
            cy.get('#dismissToast').should('be.visible');
        });
        cy.viewport('iphone-6');
        cy.get('.toast__visible').should('be.visible').within(() => {
            cy.get('.toast__jump').findAllByLabelText('Down Arrow Icon').should('be.visible');
            cy.findByText('Jump to new messages').should('not.exist');
            cy.get('.toast__message>span').should('be.visible').first().contains(`${numberOfPost} new messages`).find('time').should('not.exist');
            cy.get('#dismissToast').should('be.visible');
        });
    });
    it('MM-T1784_4 marking a channel as unread should reappear new message toast', () => {
        cy.uiClickSidebarItem(testChannelName);
        cy.get('div.toast').should('not.exist');
        scrollUp();
        const oldPostNumber = 28;
        cy.getNthPostId(-oldPostNumber).then((postId) => {
            cy.uiClickPostDropdownMenu(postId, 'Mark as Unread');
            cy.uiClickSidebarItem('off-topic');
            cy.get('div.post-list__dynamic').should('be.visible');
            cy.uiClickSidebarItem(testChannelName);
            scrollUpAndPostAMessage(otherUser, testChannelId, oldPostNumber);
            cy.get('div.toast').should('be.visible');
            cy.get('div.toast__message>span').should('be.visible').first().contains(`${oldPostNumber} new messages today`);
            const randomId = getRandomId();
            Cypress._.times(2, (num) => {
                cy.postMessageAs({sender: otherUser, message: `${num} ${randomId}`, channelId: testChannelId});
                cy.get('div.toast__message>span').should('be.visible').first().contains(`${oldPostNumber + num + 1} new messages today`);
            });
        });
    });
    it('MM-T1786 Dismissing the toast using Jump to', () => {
        const randomId = getRandomId();
        const numberOfPost = 30;
        Cypress._.times(numberOfPost, (num) => {
            cy.postMessageAs({sender: otherUser, message: `${num} ${randomId}`, channelId: testChannelId});
        });
        cy.uiClickSidebarItem(testChannelName);
        cy.get('div.toast').should('be.visible');
        cy.get('div.toast').findByText('Jump to recents').should('be.visible').click();
        cy.get('div.toast__jump').should('not.exist');
        scrollUp();
        Cypress._.times(2, (num) => {
            cy.postMessageAs({sender: otherUser, message: `${num} ${randomId}`, channelId: testChannelId});
        });
        cy.get('div.toast').should('be.visible');
        cy.get('div.toast').findByText('Jump to new messages').should('be.visible');
        scrollDown();
        cy.get('div.toast').should('not.exist');
    });
});