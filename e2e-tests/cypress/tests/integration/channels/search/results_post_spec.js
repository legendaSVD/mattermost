import {getRandomId} from '../../../utils';
describe('Search', () => {
    before(() => {
        cy.apiInitSetup({loginAfter: true}).then(({team}) => {
            cy.visit(`/${team.name}/channels/off-topic`);
            Cypress._.times(5, () => {
                cy.postMessage(`apple${getRandomId()}`);
                cy.postMessage(`banana${getRandomId()}`);
            });
        });
    });
    it('S19944 Highlighting does not change to what is being typed in the search input box', () => {
        const apple = `apple${getRandomId()}`;
        const banana = `banana${getRandomId()}`;
        const message = apple + ' ' + banana;
        cy.postMessage(message);
        cy.uiGetSearchContainer().click();
        cy.uiGetSearchBox().should('be.visible').type(apple).type('{enter}');
        cy.getLastPostId().as('lastPostId');
        cy.get('@lastPostId').then((postId) => {
            verifySearchResult(1, postId, message, apple);
        });
        cy.uiGetSearchContainer().click();
        cy.uiGetSearchBox().clear({force: true}).type(banana, {force: true});
        cy.get('@lastPostId').then((postId) => {
            verifySearchResult(1, postId, message, apple);
        });
    });
});
function verifySearchResult(results, postId, fullMessage, highlightedTerm) {
    cy.findAllByTestId('search-item-container').should('have.length', results).within(() => {
        cy.get(`#rhsPostMessageText_${postId}`).should('have.text', `${fullMessage}`);
        cy.get('.search-highlight').should('be.visible').and('have.text', highlightedTerm);
    });
}