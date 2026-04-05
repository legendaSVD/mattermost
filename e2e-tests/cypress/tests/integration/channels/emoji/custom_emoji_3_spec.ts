import * as TIMEOUTS from '../../../fixtures/timeouts';
import * as MESSAGES from '../../../fixtures/messages';
import {doReactToLastMessageShortcut, checkReactionFromPost} from '../keyboard_shortcuts/ctrl_cmd_shift_slash/helpers';
import {getCustomEmoji} from './helpers';
describe('Custom emojis', () => {
    let testTeam;
    let testUser;
    let otherUser;
    let townsquareLink;
    const builtinEmoji = 'taco';
    const builtinEmojiWithColons = ':taco:';
    const builtinEmojiUppercaseWithColons = ':TAco:';
    const largeEmojiFile = 'gif-image-file.gif';
    before(() => {
        cy.apiUpdateConfig({
            ServiceSettings: {
                EnableCustomEmoji: true,
            },
        });
    });
    beforeEach(() => {
        cy.apiAdminLogin();
        cy.apiInitSetup().then(({team, user}) => {
            testTeam = team;
            testUser = user;
            townsquareLink = `/${team.name}/channels/town-square`;
        });
        cy.apiCreateUser().then(({user: user1}) => {
            otherUser = user1;
            cy.apiAddUserToTeam(testTeam.id, otherUser.id);
        }).then(() => {
            cy.apiLogin(testUser);
            cy.visit(townsquareLink);
        });
    });
    it('MM-T2186 Emoji picker - default and custom emoji reaction, case-insensitive', () => {
        const {customEmoji, customEmojiWithColons} = getCustomEmoji();
        const messageText = 'test message';
        cy.uiOpenCustomEmoji();
        cy.findByText('Add Custom Emoji').should('be.visible').click();
        cy.get('#name').type(customEmojiWithColons);
        cy.get('input#select-emoji').attachFile(largeEmojiFile).wait(TIMEOUTS.THREE_SEC);
        cy.uiSave().wait(TIMEOUTS.THREE_SEC);
        cy.visit(townsquareLink);
        cy.postMessage(messageText);
        cy.uiGetPostTextBox().type('+' + builtinEmojiWithColons).wait(TIMEOUTS.HALF_SEC).type('{enter}').type('{enter}');
        cy.getLastPostId().then((postId) => {
            const postText = `#postMessageText_${postId}`;
            cy.get(postText).should('have.text', messageText);
            cy.clickPostReactionIcon(postId);
            cy.findByPlaceholderText('Search emojis').should('be.visible').type(builtinEmojiUppercaseWithColons, {delay: TIMEOUTS.ONE_SEC}).wait(TIMEOUTS.ONE_SEC);
            cy.findAllByTestId('emojiItem').children().should('have.length', 1);
            cy.clickEmojiInEmojiPicker(builtinEmoji);
            cy.clickPostReactionIcon(postId);
            cy.findByPlaceholderText('Search emojis').should('be.visible').type(customEmoji.substring(0, 10), {delay: TIMEOUTS.HALF_SEC});
            cy.findAllByTestId('emojiItem').children().should('have.length', 1);
            cy.findAllByTestId('emojiItem').children('img').first().should('have.class', 'emoji-category--custom');
            cy.findAllByTestId('emojiItem').children().click();
        });
        cy.uiGetPostTextBox().type('+' + builtinEmojiWithColons).wait(TIMEOUTS.HALF_SEC).type('{enter}').type('{enter}');
        cy.getLastPostId().then((postId) => {
            cy.get(`#postReaction-${postId}-` + builtinEmoji).should('be.visible');
            cy.get(`#postReaction-${postId}-` + customEmoji).should('be.visible');
        });
        cy.reload();
        cy.getLastPostId().then((postId) => {
            cy.get(`#postReaction-${postId}-` + builtinEmoji).should('be.visible');
            cy.get(`#postReaction-${postId}-` + customEmoji).should('be.visible');
        });
    });
    it('MM-T2187 Custom emoji reaction', () => {
        const {customEmoji, customEmojiWithColons} = getCustomEmoji();
        const messageText = 'test message';
        cy.uiOpenCustomEmoji();
        cy.findByText('Add Custom Emoji').should('be.visible').click();
        cy.get('#name').type(customEmojiWithColons);
        cy.get('input#select-emoji').attachFile(largeEmojiFile).wait(TIMEOUTS.THREE_SEC);
        cy.uiSave().wait(TIMEOUTS.THREE_SEC);
        cy.visit(townsquareLink);
        cy.postMessage(messageText);
        cy.getLastPostId().then((postId) => {
            cy.clickPostReactionIcon(postId);
            cy.findByPlaceholderText('Search emojis').should('be.visible').type(customEmoji, {delay: TIMEOUTS.HALF_SEC});
            cy.findAllByTestId('emojiItem').children().should('have.length', 1);
            cy.findAllByTestId('emojiItem').children('img').first().should('have.class', 'emoji-category--custom');
            cy.findAllByTestId('emojiItem').children().click();
        });
    });
    it('MM-T2188 Custom emoji - delete emoji after using in post', () => {
        const {customEmoji, customEmojiWithColons} = getCustomEmoji();
        cy.uiOpenCustomEmoji();
        cy.findByText('Add Custom Emoji').should('be.visible').click();
        cy.get('#name').type(customEmojiWithColons);
        cy.get('input#select-emoji').attachFile(largeEmojiFile).wait(TIMEOUTS.THREE_SEC);
        cy.uiSave().wait(TIMEOUTS.THREE_SEC);
        cy.visit(townsquareLink);
        cy.postMessage(customEmojiWithColons);
        cy.uiOpenCustomEmoji();
        cy.findByPlaceholderText('Search Custom Emoji').should('be.visible').type(customEmoji);
        cy.get('.emoji-list__table').should('be.visible').within(() => {
            cy.findByText('Delete').should('have.length', 1);
            cy.findByText('Delete').should('have.length', 1).click({force: true});
        });
        cy.get('#confirmModalButton').should('be.visible').click();
        cy.visit(townsquareLink);
        cy.reload();
        cy.uiOpenEmojiPicker();
        cy.findByPlaceholderText('Search emojis').should('be.visible').type(customEmojiWithColons, {delay: TIMEOUTS.HALF_SEC});
        cy.get('.no-results__title').should('be.visible').and('have.text', 'No results for “' + customEmoji + '”');
        cy.visit(townsquareLink);
        cy.getLastPost().within(() => {
            cy.get('p').should('have.html', '<span data-emoticon="' + customEmoji + '">' + customEmojiWithColons + '</span>');
        });
    });
    it('MM-T4437 Custom emoji - delete emoji after reacting with it to a post', () => {
        const {customEmoji, customEmojiWithColons} = getCustomEmoji();
        cy.uiOpenCustomEmoji();
        cy.findByText('Add Custom Emoji').should('be.visible').click();
        cy.get('#name').type(customEmojiWithColons);
        cy.get('input#select-emoji').attachFile(largeEmojiFile).wait(TIMEOUTS.THREE_SEC);
        cy.uiSave().wait(TIMEOUTS.THREE_SEC);
        cy.visit(townsquareLink);
        cy.postMessage(MESSAGES.TINY);
        doReactToLastMessageShortcut('CENTER');
        cy.get('#emojiPicker').should('be.visible').within(() => {
            cy.findByPlaceholderText('Search emojis').type(customEmojiWithColons, {delay: TIMEOUTS.HALF_SEC}).wait(TIMEOUTS.HALF_SEC);
            cy.findAllByTestId('emojiItem').children().should('have.length', 1);
            cy.findAllByTestId('emojiItem').children('img').first().should('have.class', 'emoji-category--custom');
            cy.findAllByTestId('emojiItem').children().click();
        });
        cy.getLastPostId().then((lastPostId) => {
            checkReactionFromPost(lastPostId, customEmoji);
        });
        cy.uiOpenCustomEmoji();
        cy.findByPlaceholderText('Search Custom Emoji').should('be.visible').type(customEmoji).wait(TIMEOUTS.HALF_SEC);
        cy.get('.emoji-list__table').should('be.visible').within(() => {
            cy.findAllByText(customEmojiWithColons).should('have.length', 1);
            cy.findAllByText('Delete').should('have.length', 1).click();
        });
        cy.get('#confirmModalButton').should('be.visible').click();
        cy.visit(townsquareLink);
        cy.reload();
        cy.uiOpenEmojiPicker();
        cy.findByPlaceholderText('Search emojis').should('be.visible').type(customEmojiWithColons, {delay: TIMEOUTS.HALF_SEC});
        cy.get('.no-results__title').should('be.visible').and('have.text', 'No results for “' + customEmoji + '”');
        cy.visit(townsquareLink);
        cy.getLastPost().within(() => {
            cy.findByLabelText('reactions').should('not.exist');
            cy.findByLabelText(`remove reaction ${customEmoji}}`).should('not.exist');
        });
    });
});