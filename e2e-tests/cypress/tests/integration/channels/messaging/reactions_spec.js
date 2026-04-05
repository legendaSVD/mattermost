import * as TIMEOUTS from '../../../fixtures/timeouts';
describe('Messaging', () => {
    before(() => {
        cy.apiInitSetup().then(({team, channel, user}) => {
            cy.apiLogin(user);
            cy.visit(`/${team.name}/channels/${channel.name}`);
        });
    });
    it('MM-T2189 Emoji reaction - type +:+1:', () => {
        cy.postMessage('Hello');
        cy.getLastPostId().then((postId) => {
            cy.clickPostCommentIcon(postId);
            cy.postMessageReplyInRHS('+:+1:');
            cy.get(`#${postId}_message`).within(() => {
                cy.findByLabelText('reactions').should('be.visible');
                cy.findByLabelText('You reacted with :+1:. Click to remove.').should('be.visible');
            });
            cy.uiCloseRHS();
        });
    });
    it('MM-T2190 Emoji reaction - click `+` next to existing reaction (center)', () => {
        cy.postMessage('Hello to yourself');
        cy.getLastPostId().then((postId) => {
            cy.clickPostReactionIcon(postId);
            cy.clickEmojiInEmojiPicker('smiley');
            cy.get(`#addReaction-${postId}`).should('exist').click({force: true});
            cy.clickEmojiInEmojiPicker('upside_down_face');
            cy.get(`#${postId}_message`).within(() => {
                cy.findByLabelText('reactions').should('exist');
            cy.findByLabelText('You reacted with :upside_down_face:. Click to remove.').should('exist');
            });
            cy.uiOpenEmojiPicker().then(() => {
                cy.findAllByTestId('emojiItem').first().within(($el) => {
                    cy.wrap($el).findByTestId('upside_down_face').should('exist');
                });
            });
        });
    });
    it('MM-T2192 RHS (reply) shows emoji picker for reactions - Reply box and plus icon', () => {
        cy.postMessage('Hello to you all');
        cy.getLastPostId().then((postId) => {
            cy.clickPostCommentIcon(postId).then(() => {
                cy.uiExpandRHS();
                cy.get(`#rhsPost_${postId}`).trigger('mouseover');
                cy.get(`#RHS_ROOT_reaction_${postId}`).should('exist').click({force: true});
                cy.clickEmojiInEmojiPicker('smiley');
                cy.get(`#addReaction-${postId}`).should('exist').click({force: true});
                cy.clickEmojiInEmojiPicker('upside_down_face');
                cy.get(`#rhsPost_${postId}`).within(() => {
                    cy.findByLabelText('reactions').should('be.visible');
            cy.findByLabelText('You reacted with :smiley:. Click to remove.').should('be.visible');
            cy.findByLabelText('You reacted with :upside_down_face:. Click to remove.').should('be.visible');
                });
                cy.uiCloseRHS();
            });
        });
    });
    it('MM-T2195 Emoji reaction - not available on system message Save - not available on system message Pin - not available on system message Can delete your own system message', () => {
        cy.get('button.header-placeholder').invoke('show').trigger('mouseover');
        cy.findByRoleExtended('button', {name: 'Add a channel header'}).trigger('mouseover').should('be.visible').click();
        cy.get('#editChannelHeaderModalLabel').should('be.visible');
        cy.get('textarea#edit_textbox').should('be.visible').type('This is a channel description{enter}');
        cy.getLastPostId().then((postId) => {
            cy.get(`#post_${postId}`).trigger('mouseover', {force: true});
            cy.wait(TIMEOUTS.HALF_SEC).get(`#CENTER_reaction_${postId}`).should('not.exist');
            cy.get(`#post_${postId}`).trigger('mouseover', {force: true});
            cy.wait(TIMEOUTS.HALF_SEC).get(`#CENTER_flagIcon_${postId}`).should('not.exist');
            cy.get(`#post_${postId}`).should('be.visible').within(() => {
                cy.get('.post-menu').should('be.visible').within(() => {
                    return cy.findByText('Pin to Channel').should('not.exist');
                });
            });
            cy.clickPostDotMenu(postId);
            cy.get(`#delete_post_${postId}`).click();
            cy.get('#deletePostModal').should('be.visible');
            cy.get('#deletePostModalButton').click();
        });
    });
    it('MM-T2196 Emoji reaction - not available on ephemeral message Save - not available on ephemeral message Pin - not available on ephemeral message Timestamp - not a link on ephemeral message Can close ephemeral message', () => {
        cy.postMessage('/away ');
        cy.getLastPostId().then((postId) => {
            cy.get(`#post_${postId}`).should('be.visible').within(() => {
                cy.findByText('(Only visible to you)').should('exist');
            });
            cy.get(`#post_${postId}`).trigger('mouseover', {force: true});
            cy.wait(TIMEOUTS.HALF_SEC).get(`#CENTER_reaction_${postId}`).should('not.exist');
            cy.get(`#post_${postId}`).trigger('mouseover', {force: true});
            cy.wait(TIMEOUTS.HALF_SEC).get(`#CENTER_flagIcon_${postId}`).should('not.exist');
            cy.get(`#post_${postId}`).within(() => {
                cy.wait(TIMEOUTS.HALF_SEC).get('.post-menu').should('not.exist');
            });
            cy.get(`#post_${postId}`).then((post) => {
                cy.wrap(post).find('time.post__time').invoke('text');
                cy.url().should('not.include', postId);
            });
            cy.wait(TIMEOUTS.HALF_SEC).get('button.post__remove').click({force: true});
            cy.get(`#post_${postId}`).should('not.exist');
        });
    });
});