import {ChainableT} from 'tests/types';
function uiSearchPosts(searchTerm: string) {
    cy.get('#searchFormContainer').should('be.visible').click();
    cy.get('#searchBox').find('input').clear().type(searchTerm).type('{enter}');
    cy.contains('.sidebar--right__header', 'Search Results').should('be.visible');
    cy.get('#searchContainer .LoadingSpinner').should('not.exist');
}
Cypress.Commands.add('uiSearchPosts', uiSearchPosts);
function uiJumpToSearchResult(postId: string) {
    cy.get(`#searchResult_${postId}`).contains('a', 'Jump').click();
    cy.url().should((url) => url.endsWith(`/${postId}`));
    cy.get(`#post_${postId}.post--highlight`).should('be.visible');
}
Cypress.Commands.add('uiJumpToSearchResult', uiJumpToSearchResult);
declare global {
    namespace Cypress {
        interface Chainable {
            uiSearchPosts(searchTerm: string): ChainableT<void>;
            uiJumpToSearchResult(postId: string): ChainableT<void>;
        }
    }
}