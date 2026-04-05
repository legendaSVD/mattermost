import * as TIMEOUTS from '../../../fixtures/timeouts';
describe('Archived channels', () => {
    before(() => {
        cy.apiInitSetup({loginAfter: true}).then(({team, channel}) => {
            cy.visit(`/${team.name}/channels/${channel.name}`);
        });
    });
    it('MM-T1720 Cannot add reactions to existing reactions', () => {
        const messageText = 'Test add reaction in archive channels';
        cy.postMessage(messageText);
        cy.getLastPostId().then((postId) => {
            cy.clickPostReactionIcon(postId);
            cy.findByPlaceholderText('Search emojis').should('exist').and('be.visible').
                clear().
                type('slightly_frowning_face', {delay: TIMEOUTS.QUARTER_SEC, force: true});
            cy.clickEmojiInEmojiPicker('slightly_frowning_face');
            cy.get(`#postReaction-${postId}-slightly_frowning_face .Reaction__number--display`).should('have.text', '1');
            cy.get(`#addReaction-${postId}`).should('exist');
            cy.uiArchiveChannel();
            cy.get(`#addReaction-${postId}`).should('not.exist');
            cy.get(`#postReaction-${postId}-slightly_frowning_face`).click();
            cy.get(`#postReaction-${postId}-slightly_frowning_face .Reaction__number--display`).should('have.text', '1');
            cy.get('#channel_view').click();
            cy.clickPostCommentIcon(postId);
            cy.get(`#rhsPost_${postId}`).within(() => {
                cy.get(`#addReaction-${postId}`).should('not.exist');
                cy.get(`#postReaction-${postId}-slightly_frowning_face`).click();
                cy.get(`#postReaction-${postId}-slightly_frowning_face .Reaction__number--display`).should('have.text', '1');
            });
        });
    });
});