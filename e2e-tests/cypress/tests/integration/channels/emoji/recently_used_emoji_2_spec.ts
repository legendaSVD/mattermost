import * as TIMEOUTS from '../../../fixtures/timeouts';
import * as MESSAGES from '../../../fixtures/messages';
describe('Recent Emoji', () => {
    before(() => {
        cy.apiUpdateConfig({
            ServiceSettings: {
                EnableCustomEmoji: true,
            },
        });
        cy.apiInitSetup().then(({team, user}) => {
            cy.apiLogin(user);
            cy.visit(`/${team.name}/channels/town-square`);
        });
    });
    it('MM-T4438 Changing the skin of emojis should apply the same skin to emojis in recent section', () => {
        cy.postMessage(MESSAGES.TINY);
        cy.clickPostReactionIcon();
        cy.get('#emojiPicker').should('be.visible').within(() => {
            cy.findByAltText('emoji skin tone picker').should('exist').parent().click().wait(TIMEOUTS.ONE_SEC);
            cy.findByTestId('skin-pick-default').should('exist').click();
            cy.findByPlaceholderText('Search emojis').should('exist').type('thumbsup').wait(TIMEOUTS.HALF_SEC);
            cy.findByTestId('+1,thumbsup').parent().click();
        });
        cy.uiOpenEmojiPicker().wait(TIMEOUTS.TWO_SEC);
        cy.get('#emojiPicker').should('be.visible').within(() => {
            cy.findByText('Recently Used').should('exist').and('be.visible');
            cy.findAllByTestId('emojiItem').eq(0).should('have.attr', 'aria-label', '+1 emoji');
            cy.findByAltText('emoji skin tone picker').should('exist').parent().click().wait(TIMEOUTS.ONE_SEC);
            cy.findByTestId('skin-pick-1F3FF').should('exist').click();
            cy.findAllByTestId('emojiItem').eq(0).should('have.attr', 'aria-label', '+1 dark skin tone emoji');
        });
        cy.get('body').type('{esc}', {force: true});
    });
});