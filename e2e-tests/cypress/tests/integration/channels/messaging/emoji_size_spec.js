describe('Messaging', () => {
    before(() => {
        cy.apiInitSetup({loginAfter: true}).then(({offTopicUrl}) => {
            cy.visit(offTopicUrl);
        });
    });
    it('MM-T164 Whitespace with emojis does not affect size', () => {
        const emojis = [':book:', ':key:', ':gem:'];
        cy.postMessage('hello');
        cy.uiGetPostTextBox().type('\n' + emojis.join(' ')).type('{enter}');
        cy.getLastPostId().then((postId) => {
            cy.get(`#postMessageText_${postId}`).as('newLineMessage');
        });
        cy.get('@newLineMessage').
            should('be.visible').
            and('not.contain', '\n');
        checkEmojiSize('@newLineMessage', emojis, true);
        cy.postMessage('   ' + emojis.join(' '));
        cy.getLastPostId().then((postId) => {
            cy.get(`#postMessageText_${postId}`).as('spacesMessage');
        });
        cy.get('@spacesMessage').
            should('be.visible');
        cy.get('@spacesMessage').
            should((message) => {
                expect(message.find('span.all-emoji p').html()).to.match(/^[ ]{3}/);
            });
        checkEmojiSize('@spacesMessage', emojis, true);
    });
    it('MM-T163 Emojis are not jumbo when accompanied by text', () => {
        const emojis = [':book:', ':key:', ':gem:'];
        const messageText = 'This is a message from the future';
        cy.postMessage(messageText + ' ' + emojis.join(' '));
        cy.getLastPostId().then((postId) => {
            cy.get(`#postMessageText_${postId}`).as('newLineMessage');
        });
        checkEmojiSize('@newLineMessage', emojis, false);
    });
    it('MM-T160 Emojis show as jumbo in main thread - Multi emoji, no text, including unicode and emoticon', () => {
        const emojis = [':smiley:', ':thumbsup:', '🤟'];
        cy.postMessage(emojis.join(''));
        cy.getLastPostId().then((postId) => {
            cy.get(`#postMessageText_${postId}`).as('lastMessage');
            checkEmojiSize('@lastMessage', emojis, true);
        });
    });
});
function checkEmojiSize(message, emojis, isJumbo) {
    const [height, width, size] = isJumbo ? ['min-Height', 'min-Width', '32px'] : ['height', 'width', '21px'];
    emojis.forEach((emoji) => {
        cy.get(message).
            find('span[alt="' + (emoji === '🤟' ? ':i_love_you_hand_sign:' : emoji) + '"]').
            and('have.css', height, size).
            and('have.css', width, size);
    });
}