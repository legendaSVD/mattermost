import * as TIMEOUTS from '../../../fixtures/timeouts';
import * as MESSAGES from '../../../fixtures/messages';
import {getCustomEmoji} from './helpers';
describe('Recent Emoji', () => {
    const largeEmojiFile = 'gif-image-file.gif';
    let townsquareLink;
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
            cy.apiLogin(user);
            townsquareLink = `/${team.name}/channels/town-square`;
            cy.visit(townsquareLink);
        });
    });
    it('MM-T155 Recently used emoji reactions are shown first', () => {
        const firstEmoji = 'joy';
        const secondEmoji = 'grin';
        cy.uiOpenEmojiPicker();
        cy.get('#emojiPicker').should('be.visible');
        cy.clickEmojiInEmojiPicker(firstEmoji);
        const message = 'hi';
        cy.uiGetPostTextBox().and('have.value', '😂 ').type(`${message} {enter}`);
        cy.uiWaitUntilMessagePostedIncludes(message);
        cy.clickPostReactionIcon();
        cy.clickEmojiInEmojiPicker(secondEmoji);
        cy.uiOpenEmojiPicker().wait(TIMEOUTS.HALF_SEC);
        cy.findByText(/Recently Used/i).should('exist').and('be.visible');
        cy.findAllByTestId('emojiItem').then((items) => {
            const labels = [...items].map((el) => el.getAttribute('aria-label'));
            const grinIdx = labels.indexOf('grin emoji');
            const joyIdx = labels.indexOf('joy emoji');
            expect(grinIdx, 'grin should be in recently used').to.be.greaterThan(-1);
            expect(joyIdx, 'joy should be in recently used').to.be.greaterThan(-1);
            expect(grinIdx, 'grin should appear before joy (more recent)').to.be.lessThan(joyIdx);
        });
    });
    it('MM-T4463 Recently used custom emoji, when is deleted should be removed from recent emoji category and quick reactions', () => {
        const {customEmoji, customEmojiWithColons} = getCustomEmoji();
        cy.uiOpenCustomEmoji();
        cy.findByText('Add Custom Emoji').should('be.visible').click();
        cy.get('#name').type(customEmojiWithColons);
        cy.get('input#select-emoji').attachFile(largeEmojiFile).wait(TIMEOUTS.THREE_SEC);
        cy.uiSave().wait(TIMEOUTS.THREE_SEC);
        cy.visit(townsquareLink);
        cy.postMessage(`${MESSAGES.TINY}-second :lemon:`);
        cy.uiGetPostTextBox().clear().type(`${MESSAGES.TINY}-recent ${customEmojiWithColons.slice(0, -1)}`).wait(TIMEOUTS.TWO_SEC);
        cy.uiGetPostTextBox().type('{enter} {enter}').wait(TIMEOUTS.TWO_SEC);
        cy.getLastPostId().then((postId) => {
            cy.get(`#post_${postId}`).trigger('mouseover');
        });
        cy.get('#recent_reaction_0').should('exist').then((recentReaction) => {
            expect(recentReaction[0].style.backgroundImage).to.include('api/v4/emoji');
        });
        cy.get('#recent_reaction_1').should('exist').then((recentReaction) => {
            expect(recentReaction[0].style.backgroundImage).to.include('static/emoji/');
        });
        cy.uiOpenEmojiPicker();
        cy.findByText('Recently Used').should('exist').and('be.visible');
        cy.findAllByTestId('emojiItem').eq(0).find('img').should('have.attr', 'class', 'emoji-category--custom');
        cy.findAllByTestId('emojiItem').eq(1).should('have.attr', 'aria-label', 'lemon emoji');
        cy.findByText('Custom Emoji').should('be.visible').click();
        cy.findByPlaceholderText('Search Custom Emoji').should('be.visible').type(customEmoji).wait(TIMEOUTS.HALF_SEC);
        cy.get('.emoji-list__table').should('be.visible').within(() => {
            cy.findAllByText(customEmojiWithColons).should('have.length', 1);
            cy.findAllByText('Delete').should('have.length', 1).click();
        });
        cy.get('#confirmModalButton').should('be.visible').click();
        cy.visit(townsquareLink);
        cy.reload();
        cy.getLastPostId().then((postId) => {
            cy.get(`#post_${postId}`).trigger('mouseover');
        });
        cy.get('#recent_reaction_0').should('exist').then((recentReaction) => {
            expect(recentReaction[0].style.backgroundImage).to.include('static/emoji/');
        });
        cy.uiOpenEmojiPicker();
        cy.findByText('Recently Used').should('exist').and('be.visible');
        cy.findAllByTestId('emojiItem').eq(0).should('have.attr', 'aria-label', 'lemon emoji');
    });
});