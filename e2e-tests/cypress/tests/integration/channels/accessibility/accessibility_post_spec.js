import * as TIMEOUTS from '../../../fixtures/timeouts';
import {getRandomId} from '../../../utils';
describe('Verify Accessibility Support in Post', () => {
    let testUser;
    let otherUser;
    let testTeam;
    let testChannel;
    before(() => {
        cy.apiInitSetup().then(({team, channel, user}) => {
            testUser = user;
            testTeam = team;
            testChannel = channel;
            cy.apiCreateUser({prefix: 'other'}).then(({user: user1}) => {
                otherUser = user1;
                cy.apiAddUserToTeam(testTeam.id, otherUser.id).then(() => {
                    cy.apiAddUserToChannel(testChannel.id, otherUser.id);
                });
            });
        });
    });
    beforeEach(() => {
        cy.apiLogin(testUser);
        cy.visit(`/${testTeam.name}/channels/${testChannel.name}`);
        cy.get('#postListContent', {timeout: TIMEOUTS.ONE_MIN}).should('be.visible');
    });
    it('MM-T1479 Verify Reader reads out the post correctly on Center Channel', () => {
        const {lastMessage} = postMessages(testChannel, otherUser, 1);
        performActionsToLastPost();
        cy.get('#FormattingControl_bold').focus().tab({shift: true}).tab({shift: true});
        cy.get('body').type('{uparrow}{downarrow}');
        cy.getLastPostId().then((postId) => {
            verifyPostLabel(`#post_${postId}`, otherUser.username, `wrote, ${lastMessage}, 2 reactions, message is saved and pinned`);
        });
    });
    it('MM-T1480 Verify Reader reads out the post correctly on RHS', () => {
        const {lastMessage} = postMessages(testChannel, otherUser, 1);
        performActionsToLastPost();
        cy.getLastPostId().then((postId) => {
            cy.clickPostCommentIcon(postId);
            cy.get('#rhsContainer').should('be.visible');
            const replyMessage = 'A reply to an older post';
            cy.postMessageReplyInRHS(replyMessage);
            cy.get('#rhsContainer').within(() => {
                cy.get('#FormattingControl_bold').focus().tab({shift: true}).tab({shift: true}).type('{uparrow}');
                verifyPostLabel(`#rhsPost_${postId}`, otherUser.username, `wrote, ${lastMessage}, 2 reactions, message is saved and pinned`);
            });
            cy.getLastPostId().then((replyId) => {
                cy.get('#rhsContainer').within(() => {
                    cy.get('#FormattingControl_bold').focus().tab({shift: true}).tab({shift: true}).type('{uparrow}{downarrow}');
                    verifyPostLabel(`#rhsPost_${replyId}`, testUser.username, `replied, ${replyMessage}`);
                });
            });
        });
    });
    it('MM-T1486_1 Verify different Post Focus on Center Channel', () => {
        postMessages(testChannel, otherUser, 5);
        cy.get('#FormattingControl_bold').focus().tab({shift: true}).tab({shift: true}).type('{uparrow}');
        for (let index = 1; index < 5; index++) {
            cy.getNthPostId(-index - 1).then((postId) => {
                cy.get(`#post_${postId}`).should('be.focused');
                cy.get('body').type('{uparrow}');
            });
        }
        for (let index = 5; index > 0; index--) {
            cy.getNthPostId(-index - 1).then((postId) => {
                cy.get(`#post_${postId}`).should('be.focused');
                cy.get('body').type('{downarrow}');
            });
        }
    });
    it('MM-T1486_2 Verify different Post Focus on RHS', () => {
        const message = `hello from current user: ${getRandomId()}`;
        cy.postMessage(message);
        cy.getLastPostId().then((postId) => {
            cy.clickPostCommentIcon(postId);
            cy.get('#rhsContainer').should('be.visible');
            for (let index = 0; index < 3; index++) {
                const replyMessage = `A reply ${getRandomId()}`;
                cy.postMessageReplyInRHS(replyMessage);
                const otherMessage = `reply from ${otherUser.username}: ${getRandomId()}`;
                cy.postMessageAs({sender: otherUser, message: otherMessage, channelId: testChannel.id, rootId: postId});
            }
        });
        cy.get('#rhsContainer').within(() => {
            cy.get('#FormattingControl_bold').focus().tab({shift: true}).tab({shift: true}).type('{uparrow}');
        });
        for (let index = 1; index < 5; index++) {
            cy.getNthPostId(-index - 1).then((postId) => {
                cy.get(`#rhsPost_${postId}`).should('be.focused');
                cy.get('body').type('{uparrow}');
            });
        }
        for (let index = 5; index > 1; index--) {
            cy.getNthPostId(-index - 1).then((postId) => {
                cy.get(`#rhsPost_${postId}`).should('be.focused');
                cy.get('body').type('{downarrow}');
            });
        }
    });
    it('MM-T1486_3 Verify Tab support on Post on Center Channel', () => {
        postMessages(testChannel, otherUser, 1);
        cy.get('#FormattingControl_bold').focus().tab({shift: true}).tab({shift: true}).tab({shift: true}).tab({shift: true});
        cy.getLastPostId().then((postId) => {
            cy.get(`#post_${postId}`).within(() => {
                cy.get('button.status-wrapper').first().should('be.focused');
                cy.focused().tab();
                cy.get('button.user-popover').should('be.focused');
                cy.focused().tab();
                cy.get(`#CENTER_time_${postId}`).should('be.focused');
                cy.focused().tab();
                for (let i = 0; i < 3; i++) {
                    cy.get(`#recent_reaction_${i}`).should('have.class', 'emoticon--post-menu').and('have.attr', 'aria-label');
                    cy.focused().tab();
                }
                cy.get(`#CENTER_reaction_${postId}`).should('be.focused').and('have.attr', 'aria-label', 'Add Reaction');
                cy.focused().tab();
                cy.get(`#CENTER_flagIcon_${postId}`).should('be.focused').and('have.attr', 'aria-label', 'save message');
                cy.focused().tab();
                cy.get(`#CENTER_actions_button_${postId}`).should('be.focused').and('have.attr', 'aria-label', 'actions');
                cy.focused().tab();
                cy.get(`#CENTER_commentIcon_${postId}`).should('be.focused').and('have.attr', 'aria-label', 'reply');
                cy.focused().tab();
                cy.get(`#CENTER_button_${postId}`).should('be.focused').and('have.attr', 'aria-label', 'more');
                cy.focused().tab();
            });
        });
    });
    it('MM-T1486_4 Verify Tab support on Post on RHS', () => {
        const message = `hello from current user: ${getRandomId()}`;
        cy.postMessage(message);
        cy.getLastPostId().then((postId) => {
            cy.clickPostCommentIcon(postId);
            cy.get('#rhsContainer').should('be.visible');
            const replyMessage = `A reply ${getRandomId()}`;
            cy.postMessageReplyInRHS(replyMessage);
            const otherMessage = `reply from ${otherUser.username}: ${getRandomId()}`;
            cy.postMessageAs({sender: otherUser, message: otherMessage, channelId: testChannel.id, rootId: postId});
        });
        cy.get('#rhsContainer').within(() => {
            cy.get('#FormattingControl_bold').focus().tab({shift: true}).tab({shift: true});
        });
        cy.getLastPostId().then((postId) => {
            cy.get(`#rhsPost_${postId}`).within(() => {
                cy.get(`#RHS_COMMENT_time_${postId}`).should('be.focused');
                cy.focused().tab({shift: true});
                cy.get('button.user-popover').should('be.focused');
                cy.focused().tab().tab();
                cy.get('#recent_reaction_0').should('have.class', 'emoticon--post-menu').and('have.attr', 'aria-label');
                cy.focused().tab();
                cy.get(`#RHS_COMMENT_reaction_${postId}`).should('be.focused').and('have.attr', 'aria-label', 'Add Reaction');
                cy.focused().tab();
                cy.get(`#RHS_COMMENT_flagIcon_${postId}`).should('be.focused').and('have.attr', 'aria-label', 'save message');
                cy.focused().tab();
                cy.get(`#RHS_COMMENT_actions_button_${postId}`).should('be.focused').and('have.attr', 'aria-label', 'actions');
                cy.focused().tab();
                cy.get(`#RHS_COMMENT_button_${postId}`).should('be.focused').and('have.attr', 'aria-label', 'more');
                cy.focused().tab({shift: true});
            });
        });
    });
    it('MM-T1462 Verify incoming messages are read', () => {
        cy.uiGetLhsSection('CHANNELS').findByText('Off-Topic').click();
        cy.get('#postListContent', {timeout: TIMEOUTS.ONE_MIN}).should('be.visible');
        cy.uiGetLhsSection('CHANNELS').findByText(testChannel.display_name).click();
        cy.get('#postListContent', {timeout: TIMEOUTS.ONE_MIN}).should('be.visible');
        const message = `verify incoming message from ${otherUser.username}: ${getRandomId()}`;
        cy.postMessageAs({sender: otherUser, message, channelId: testChannel.id});
        cy.uiWaitUntilMessagePostedIncludes(message);
        cy.get('#postListContent').within(() => {
            cy.get('.sr-only').should('have.attr', 'aria-live', 'polite').as('incomingMessage');
        });
        cy.get('@incomingMessage').invoke('text').then((text) => {
            expect(text).contain(message);
        });
    });
});
function postMessages(testChannel, otherUser, count) {
    let lastMessage;
    for (let index = 0; index < count; index++) {
        const message = `hello from current user: ${getRandomId()}`;
        cy.postMessage(message);
        lastMessage = `hello from ${otherUser.username}: ${getRandomId()}`;
        cy.postMessageAs({sender: otherUser, message: lastMessage, channelId: testChannel.id});
    }
    return {lastMessage};
}
function performActionsToLastPost() {
    cy.getLastPostId().then((postId) => {
        cy.clickPostReactionIcon(postId);
        cy.findAllByTestId('grinning').first().trigger('mouseover', {force: true});
        cy.get('.sprite-preview').should('be.visible');
        cy.get('.emoji-picker__preview').should('be.visible').and('have.text', ':grinning:');
        cy.findAllByTestId('grinning').first().click({force: true});
        cy.get(`#postReaction-${postId}-grinning`).should('be.visible');
        cy.clickPostReactionIcon(postId);
        cy.findAllByTestId('smile').first().trigger('mouseover', {force: true});
        cy.get('.sprite-preview').should('be.visible');
        cy.get('.emoji-picker__preview').should('be.visible').and('have.text', ':smile:');
        cy.findAllByTestId('smile').first().click({force: true});
        cy.get(`#postReaction-${postId}-smile`).should('be.visible');
        cy.clickPostSaveIcon(postId);
        cy.clickPostDotMenu(postId);
        cy.get(`#pin_post_${postId}`).click();
        cy.clickPostDotMenu(postId);
        cy.get('body').type('{esc}');
    });
}
function verifyPostLabel(elementId, username, labelSuffix) {
    cy.get(elementId).as('lastPost').should('be.focused');
    cy.get('@lastPost').then((el) => {
        cy.wrap(el).find('time.post__time').invoke('attr', 'datetime').then((time) => {
            const parsedTime = Cypress.dayjs(time);
            const expectedLabel = `At ${parsedTime.format('h:mm A dddd, MMMM D')}, ${username} ${labelSuffix}`;
            cy.wrap(el).should('have.attr', 'aria-label', expectedLabel);
        });
    });
}