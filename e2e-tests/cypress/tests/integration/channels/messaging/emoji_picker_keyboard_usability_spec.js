describe('MM-13064 - Emoji picker keyboard usability', () => {
    let offTopicUrl;
    before(() => {
        cy.apiInitSetup({loginAfter: true}).then((out) => {
            offTopicUrl = out.offTopicUrl;
        });
    });
    beforeEach(() => {
        cy.visit(offTopicUrl);
        cy.uiOpenEmojiPicker();
        cy.get('#emojiPicker').should('be.visible');
    });
    it('If the left arrow key is pressed while focus is on the emoji picker text box, the cursor should move left in the text', () => {
        cy.findByLabelText('Search for an emoji').
            should('be.visible').
            and('have.focus').
            type('si').
            should('have.value', 'si').
            type('{leftarrow}{leftarrow}m').
            should('have.value', 'smi');
    });
    it('If the right arrow key is pressed when the cursor is at the end of the word in the text box, move the selection to the right in the emoji picker, otherwise move the cursor to the right in the text', () => {
        cy.findByLabelText('Search for an emoji').
            should('be.visible').
            and('have.focus').
            type('si').
            should('have.value', 'si').
            type('{leftarrow}{leftarrow}m').
            should('have.value', 'smi').
            type('{leftarrow}{leftarrow}').
            type('{rightarrow}l').
            should('have.value', 'smil');
        cy.get('.emoji-picker__item.selected').should('exist').within(() => {
            cy.findByTestId('smile').should('exist');
        });
        cy.get('.emoji-picker__preview').should('have.text', ':smile:');
        cy.findByLabelText('Search for an emoji').
            should('have.focus').
            and('have.value', 'smil').
            type('{rightarrow}').
            should('have.value', 'smil');
        cy.get('.emoji-picker__item.selected').should('exist').within(() => {
            cy.findByTestId('smile_cat').should('exist');
        });
        cy.get('.emoji-picker__preview').should('have.text', ':smile_cat:');
    });
    it('On up or down arrow key press, move the selection up or down the emoji items', () => {
        cy.get('.emoji-picker__preview').should('have.text', ':grinning:');
        cy.get('body').type('{downarrow}');
        cy.get('.emoji-picker__preview').should('have.text', ':upside_down_face:');
        cy.get('body').type('{uparrow}');
        cy.get('.emoji-picker__preview').should('have.text', ':grinning:');
        cy.get('body').type('{uparrow}');
        cy.get('.emoji-picker__preview').should('have.text', 'Select an Emoji');
    });
    it('On up arrow key, move around search input or highlight the text when holding shift key', () => {
        cy.get('body').type('mi');
        cy.findByLabelText('Search for an emoji').should('have.value', 'mi');
        cy.get('body').type('{uparrow}{uparrow}').type('s');
        cy.findByLabelText('Search for an emoji').should('have.value', 'smi');
        cy.findByLabelText('Search for an emoji').type('{uparrow}');
        verifySelectedTextAs('');
        cy.findByLabelText('Search for an emoji').type('{shift}{uparrow}');
        verifySelectedTextAs('smi');
    });
    it('On down arrow key, move around the search input or highlight the text when holding shift key', () => {
        cy.get('body').type('sm');
        cy.findByLabelText('Search for an emoji').should('have.value', 'sm');
        cy.findByLabelText('Search for an emoji').type('{uparrow}{uparrow}{downarrow}i').should('have.value', 'smi');
        cy.findByLabelText('Search for an emoji').type('{uparrow}{uparrow}');
        verifySelectedTextAs('');
        cy.findByLabelText('Search for an emoji').type('{shift}{downarrow}');
        verifySelectedTextAs('smi');
    });
});
function verifySelectedTextAs(text) {
    cy.document().then((doc) => {
        expect(doc.getSelection().toString()).to.eq(text);
    });
}