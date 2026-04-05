import {ChainableT} from 'tests/types';
Cypress.Commands.add('uiGetEmojiPicker', (): ChainableT<JQuery> => {
    return cy.get('#emojiPicker').should('be.visible');
});
Cypress.Commands.add('uiOpenEmojiPicker', (): ChainableT<JQuery> => {
    cy.findByRole('button', {name: 'select an emoji'}).click();
    return cy.get('#emojiPicker').should('be.visible');
});
Cypress.Commands.add('uiOpenCustomEmoji', () => {
    cy.uiOpenEmojiPicker();
    cy.findByText('Custom Emoji').should('be.visible').click();
    cy.url().should('include', '/emoji');
    cy.get('.backstage-header').should('be.visible').and('contain', 'Custom Emoji');
});
declare global {
    namespace Cypress {
        interface Chainable {
            uiGetEmojiPicker(): Chainable;
            uiOpenCustomEmoji(): Chainable;
            uiOpenEmojiPicker(): Chainable;
        }
    }
}