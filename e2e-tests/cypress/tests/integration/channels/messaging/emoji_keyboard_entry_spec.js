describe('MM-T154 Use keyboard navigation in emoji picker', () => {
    before(() => {
        cy.apiInitSetup({loginAfter: true}).then(({offTopicUrl}) => {
            cy.visit(offTopicUrl);
        });
    });
    beforeEach(() => {
        cy.uiOpenEmojiPicker();
        cy.get('#emojiPicker').should('be.visible');
    });
    ['right', 'down'].forEach((dir) => {
        it(`${dir} keypress should select the first emoji on start without prior selection`, () => {
            cy.get('#emojiPickerSearch').type(`{${dir}arrow}`);
            testSelectedIndex((idx) => expect(idx).to.equal((dir === 'right') ? 1 : 0));
            cy.get('#emojiPickerButton').click();
        });
    });
    ['left', 'up'].forEach((dir) => {
        it(`${dir} keypress should select nothing on start without prior selection`, () => {
            cy.get('#emojiPickerSearch').type(`{${dir}arrow}`);
            cy.get('.emoji-picker__item.selected').should('not.exist');
            cy.get('#emojiPickerButton').click();
        });
    });
    it('should select emoji on continuous keypress', () => {
        let lastSelected = null;
        const pressCounts = {
            right: 5,
            down: 5,
            left: 4,
            up: 5,
        };
        const checkSelectionId = (selectedEmoji) => {
            expect(selectedEmoji).to.not.equal(lastSelected);
            lastSelected = selectedEmoji;
        };
        const checkSelectionSrc = (selectedEmoji) => {
            cy.get('#emojiPickerSpritePreview').invoke('attr', 'src').should('equal', selectedEmoji);
        };
        for (const direction of Object.keys(pressCounts)) {
            for (let i = 0; i < pressCounts[direction]; i += 1) {
                cy.get('#emojiPickerSearch').type(`{${direction}arrow}`);
                cy.get('.emoji-picker__item.selected img').invoke('attr', 'id').then(checkSelectionId);
                cy.get('.emoji-picker__item.selected img').invoke('attr', 'src').then(checkSelectionSrc);
            }
        }
        cy.get('#emojiPickerButton').click();
    });
    it('should post selected emoji', () => {
        cy.get('#emojiPickerSearch').type('{rightarrow}{downarrow}');
        cy.get('.emoji-picker__preview').invoke('text').then((selectedEmoji) => {
            cy.get('#emojiPickerSearch').type('{enter}');
            cy.uiGetPostTextBox().type('{enter}');
            cy.getLastPost().find('.emoticon').should('have.attr', 'aria-label', selectedEmoji);
        });
    });
});
const testSelectedIndex = (done) => {
    cy.get('button.emoji-picker__item.selected').then((selectedEmoji) => {
        done(selectedEmoji.index());
    });
};