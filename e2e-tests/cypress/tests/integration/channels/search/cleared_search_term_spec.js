import * as TIMEOUTS from '../../../fixtures/timeouts';
describe('Search', () => {
    const term = 'London';
    before(() => {
        cy.apiInitSetup({loginAfter: true}).then(({offTopicUrl}) => {
            cy.visit(offTopicUrl);
            cy.postMessage(term);
            cy.uiWaitUntilMessagePostedIncludes(term);
        });
    });
    it('MM-T352 - Cleared search term should not reappear as RHS is opened and closed', () => {
        cy.uiGetSearchContainer().should('be.visible').click();
        cy.uiGetSearchBox().
            type(`${term}{enter}`).
            wait(TIMEOUTS.ONE_SEC);
        cy.get('#search-items-container').should('be.visible');
        cy.uiGetSearchContainer().type('{esc}');
        cy.uiGetRHS().should('contain', 'Search Results');
        cy.uiCloseRHS();
        cy.uiGetRHS({visible: false});
        cy.uiGetSearchContainer().should('be.visible').click();
        cy.uiGetSearchBox().should('be.empty');
        cy.uiGetSearchBox().type('{esc}');
        cy.uiGetSearchContainer().should('be.visible').click();
        cy.uiGetSearchBox().and('be.empty');
        cy.uiGetSearchBox().type('{esc}');
    });
});