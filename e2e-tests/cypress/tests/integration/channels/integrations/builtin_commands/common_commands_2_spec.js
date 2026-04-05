import * as TIMEOUTS from '../../../../fixtures/timeouts';
import {getRandomId} from '../../../../utils';
describe('Integrations', () => {
    let testUser;
    let testChannel;
    let otherChannel;
    before(() => {
        cy.apiInitSetup({userPrefix: 'testUser'}).then(({team, user, channel}) => {
            testUser = user;
            testChannel = channel;
            cy.apiCreateChannel(team.id, 'other-channel', 'Other Channel').then((out) => {
                otherChannel = out.channel;
            });
            cy.apiLogin(testUser);
            cy.visit('/');
        });
    });
    beforeEach(() => {
        cy.get('#sidebarItem_off-topic').click();
        cy.uiGetPostTextBox();
    });
    it('MM-T683 /join', () => {
        cy.postMessage(`/join ~${otherChannel.name} `);
        cy.get('#channelHeaderTitle').should('be.visible').should('contain', otherChannel.display_name);
    });
    it('MM-T684 /me', () => {
        const message = getRandomId();
        cy.postMessage(`/me ${message}`);
        cy.uiWaitUntilMessagePostedIncludes(message);
        cy.getLastPostId().then((postId) => {
            cy.get(`#post_${postId}`).find('.user-popover').should('have.text', testUser.username);
            cy.get(`#postMessageText_${postId}`).should('have.text', message);
            cy.get(`#post_${postId}`).should('have.class', 'post--system');
        });
    });
    it('MM-T685 /me not case-sensitive', () => {
        const message = getRandomId();
        cy.postMessage(`/Me ${message}`);
        cy.getLastPostId().then((postId) => {
            cy.get(`#post_${postId}`).find('.user-popover').should('have.text', testUser.username);
            cy.get(`#postMessageText_${postId}`).should('have.text', message);
        });
    });
    it('MM-T2345 /me on RHS', () => {
        cy.get(`#sidebarItem_${testChannel.name}`).click();
        cy.get('#channelHeaderTitle').should('be.visible').should('contain', testChannel.display_name);
        const rootMessage = 'root message';
        cy.postMessage(rootMessage);
        cy.clickPostCommentIcon();
        cy.getLastPostId().then((postId) => {
            [`#rhsPost_${postId}`, `#post_${postId}`].forEach((selector) => {
                cy.get(selector).should('have.class', 'current--user').within(() => {
                    cy.get('.post__header').findByText(testUser.username);
                    cy.get('.post-message__text').findByText(rootMessage).should('have.css', 'color', 'rgb(63, 67, 80)');
                });
            });
        });
        const message = 'reply';
        cy.postMessageReplyInRHS(`/me ${message} `);
        cy.uiWaitUntilMessagePostedIncludes(message);
        cy.getLastPostId().then((postId) => {
            [`#rhsPost_${postId}`, `#post_${postId}`].forEach((selector) => {
                cy.get(selector).should('have.class', 'current--user').within(() => {
                    cy.get('.profile-icon').should('not.be.visible');
                    cy.get('.post-message__text').findByText(message).should('have.css', 'color', 'rgba(63, 67, 80, 0.75)');
                });
            });
        });
    });
    it('MM-T710 /mute error message', () => {
        const invalidChannel = `invalid-channel-${getRandomId()}`;
        cy.postMessage(`/mute ${invalidChannel} `);
        cy.uiWaitUntilMessagePostedIncludes('Please use the channel handle to identify channels');
        cy.getLastPostId().then((postId) => {
            cy.get(`#postMessageText_${postId}`).
                should('have.text', `Could not find the channel ${invalidChannel}. Please use the channel handle to identify channels.`).
                contains('a', 'channel handle').then((link) => {
                    const href = link.prop('href');
                    cy.request(href).its('allRequestResponses').then((response) => {
                        cy.wrap(response[0]['Request URL']).should('equal', 'https://docs.mattermost.com/messaging/managing-channels.html#naming-a-channel');
                    });
                });
        });
    });
    it('MM-T2834 Slash command help stays visible for system slash command', () => {
        cy.uiGetPostTextBox().clear().type('/rename ');
        cy.get('#suggestionList').should('exist').and('be.visible').within(() => {
            cy.findAllByText('[text]').first().should('exist');
        });
        cy.uiGetPostTextBox().type('Hello{enter}').wait(TIMEOUTS.HALF_SEC);
        cy.uiGetPostTextBox().invoke('text').should('be.empty');
    });
});