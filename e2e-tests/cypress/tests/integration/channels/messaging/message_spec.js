import {getAdminAccount} from '../../../support/env';
import * as MESSAGES from '../../../fixtures/messages';
import timeouts from '../../../fixtures/timeouts';
describe('Message', () => {
    const admin = getAdminAccount();
    let testTeam;
    let testChannel;
    before(() => {
        cy.apiInitSetup({loginAfter: true}).then(({team, channel}) => {
            testTeam = team;
            testChannel = channel;
            cy.visit(`/${testTeam.name}/channels/off-topic`);
        });
    });
    beforeEach(() => {
        cy.get('body').then(($body) => {
            if ($body.find('.modal.in').length > 0) {
                cy.get('body').type('{esc}');
            }
        });
    });
    it('MM-T77 Consecutive message does not repeat profile info', () => {
        cy.get('#postListContent').should('be.visible');
        cy.postMessageAs({sender: admin, message: 'Hello', channelId: testChannel.id});
        cy.postMessage('One');
        shouldHavePostProfileImageVisible(true);
        cy.postMessage('Two');
        shouldHavePostProfileImageVisible(false);
        cy.postMessage('Three');
        shouldHavePostProfileImageVisible(false);
    });
    it('MM-T201 Focus move to main input box when a character key is selected', () => {
        cy.postMessage('Message');
        cy.getLastPostId().then((postId) => {
            const divPostId = `#post_${postId}`;
            cy.get(divPostId).click().wait(timeouts.ONE_SEC);
            cy.uiGetPostTextBox().type('A');
            cy.clickPostDotMenu(postId);
            cy.get(`#CENTER_dropdown_${postId}`).should('be.visible');
            cy.get('body').type('{esc}');
            cy.get(`#CENTER_dropdown_${postId}`).should('not.exist');
            cy.get('.modal.in').should('not.exist');
            cy.uiGetPostTextBox().type('A');
            cy.focused().should('have.id', 'post_textbox');
            cy.focused().should('contain', 'AA');
        });
    });
    it('MM-T72 @here. @all. @channel. (containing a period) still highlight', () => {
        cy.postMessage('@here. @all. @channel.');
        cy.getLastPostId().then((postId) => {
            const divPostId = `#postMessageText_${postId}`;
            cy.get(divPostId).find('p').should('have.text', '@here. @all. @channel.');
            cy.get(divPostId).find('.mention--highlight').
                first().should('have.text', '@here').should('not.have.text', '.').
                next().should('have.text', '@all').should('not.have.text', '.').
                next().should('have.text', '@channel').should('not.have.text', '.');
        });
    });
    it('MM-2954 /me message should be formatted like a system message', () => {
        const message = 'hello there';
        cy.postMessage(`/me ${message}`);
        cy.uiWaitUntilMessagePostedIncludes(message);
        cy.getLastPostId().then((postId) => {
            const divPostId = `#post_${postId}`;
            cy.get(divPostId).should('have.class', 'post--system');
        });
    });
    it('message with emoji contains hidden shortcode text', () => {
        const message = 'This post has a shortcode emoji :raising_hand_man: within it.';
        cy.postMessage(message);
        cy.getLastPostId().then((postId) => {
            const divPostId = `#post_${postId}`;
            cy.get(`#postMessageText_${postId}`).should('have.text', message);
            cy.get(divPostId).find('span.emoticon').should('have.text', ':raising_hand_man:');
        });
    });
    it('message with unicode emoji displays the unicode and not a span with background image', () => {
        cy.postMessage('This post a unicode emoji in a code snippet: `😉`');
        cy.getLastPostId().then((postId) => {
            const divPostId = `#post_${postId}`;
            cy.get(divPostId).find('span.emoticon').should('not.exist');
            cy.get(divPostId).find('span.codespan__pre-wrap code').should('have.text', '😉');
        });
    });
    it('MM-T3307 Focus remains in the RHS text box', () => {
        cy.postMessage(MESSAGES.MEDIUM);
        cy.clickPostCommentIcon();
        cy.uiGetReplyTextBox().type(MESSAGES.TINY);
        cy.get('#PreviewInputTextButton').click();
        cy.uiReply();
        cy.uiGetReplyTextBox().should('be.focused');
    });
});
function shouldHavePostProfileImageVisible(isVisible = true) {
    cy.getLastPostId().then((postID) => {
        const target = `#post_${postID}`;
        if (isVisible) {
            cy.get(target).invoke('attr', 'class').
                should('contain', 'current--user').
                and('contain', 'other--root');
            cy.get(`${target} > div[data-testid='postContent'] > .post__img`).should('be.visible');
        } else {
            cy.get(target).invoke('attr', 'class').
                should('contain', 'current--user').
                and('contain', 'same--user').
                and('contain', 'same--root');
            cy.get(`${target} > div[data-testid='postContent'] > .post__img`).
                should('be.visible').
                and('be.empty');
        }
    });
}