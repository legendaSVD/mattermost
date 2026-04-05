let previousEmoji = 'grinning';
function verifyArrowKeysEmojiNavigation(arrowKey, count) {
    for (let index = 0; index < count; index++) {
        cy.get('body').type(arrowKey);
        cy.get('.emoji-picker__preview-name').invoke('text').then((selectedEmoji) => {
            expect(selectedEmoji).not.equal(previousEmoji);
            previousEmoji = selectedEmoji;
        });
    }
}
describe('Verify Accessibility Support in Popovers', () => {
    before(() => {
        cy.apiInitSetup({loginAfter: true}).then(({offTopicUrl}) => {
            cy.visit(offTopicUrl);
            cy.postMessage(`hello from test user: ${Date.now()}`);
        });
    });
    it('MM-T1489 Accessibility Support in Emoji Popover on click of Emoji Reaction button', () => {
        cy.getLastPostId().then((postId) => {
            cy.clickPostReactionIcon(postId);
            cy.get('#emojiPickerSearch').should('have.attr', 'aria-label', 'Search for an emoji');
            cy.get('#emojiPickerCategories').children().eq(0).focus().tab({shift: true}).tab();
            const categories = [
                {ariaLabel: 'Smileys & Emotion', header: 'Smileys & Emotion'},
                {ariaLabel: 'People & Body', header: 'People & Body'},
                {ariaLabel: 'Animals & Nature', header: 'Animals & Nature'},
                {ariaLabel: 'Food & Drink', header: 'Food & Drink'},
                {ariaLabel: 'Travel & Places', header: 'Travel & Places'},
                {ariaLabel: 'Activities', header: 'Activities'},
                {ariaLabel: 'Objects', header: 'Objects'},
                {ariaLabel: 'Symbols', header: 'Symbols'},
                {ariaLabel: 'Flags', header: 'Flags'},
            ];
            cy.get('#emojiPickerCategories').children('.emoji-picker__category').each(($el, index) => {
                if (index < categories.length) {
                    cy.get($el).should('have.class', 'a11y--active a11y--focused').should('have.attr', 'aria-label', categories[index].ariaLabel);
                    cy.get($el).trigger('click').tab();
                    cy.findByText(categories[index].header).should('be.visible');
                    verifyArrowKeysEmojiNavigation('{rightarrow}', 3);
                    verifyArrowKeysEmojiNavigation('{leftarrow}', 2);
                    cy.get($el).focus().tab();
                }
            });
            cy.get('body').click();
        });
    });
});