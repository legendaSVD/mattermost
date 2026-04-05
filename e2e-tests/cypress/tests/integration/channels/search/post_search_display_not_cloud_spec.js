import * as TIMEOUTS from '../../../fixtures/timeouts';
describe('Search', () => {
    before(() => {
        cy.shouldNotRunOnCloudEdition();
        cy.apiUpdateConfig({
            ServiceSettings: {
                EnableTesting: true,
            },
        });
    });
    beforeEach(() => {
        cy.apiAdminLogin();
        cy.apiInitSetup({loginAfter: true}).then(({offTopicUrl}) => {
            cy.visit(offTopicUrl);
        });
    });
    it('MM-T350 - Searching displays results in RHS', () => {
        const testSearch = '/test url test-search';
        cy.postMessage(testSearch);
        cy.uiGetSearchContainer().click();
        cy.uiGetSearchBox().type('hello{enter}').wait(TIMEOUTS.HALF_SEC);
        cy.get('#search-items-container span').should('contain.text', 'hello');
        cy.get('#search-items-container').should('be.visible');
        cy.get('[data-testid="search-item-container"]').first().then(($result) => {
            cy.wrap($result).contains('Basic word search: Hello world!');
            cy.wrap($result).get('h5.markdown__heading').contains('Hello');
            cy.wrap($result).get('.post-code.post-code--wrap code').contains('Hello');
            cy.wrap($result).contains('#hello');
            cy.wrap($result).get('a.search-item__jump').first().click();
            cy.uiGetSearchContainer().click();
            cy.get('.input-clear-x').first().trigger('mouseover', {force: true}).then(($span) => {
                cy.wrap($span).click({force: true});
                cy.get('[data-testid="search-item-container"]').should('be.visible');
            });
        });
    });
    it('MM-T2286 - Clicking a hashtag from a message opens messages with that hashtag on RHS', () => {
        const testSearch = '/test url test-search';
        cy.postMessage(testSearch);
        cy.get('#showMoreButton').click().wait(TIMEOUTS.HALF_SEC);
        cy.get('[data-hashtag="#hello"]').first().click().wait(TIMEOUTS.HALF_SEC);
        cy.get('#search-items-container').should('be.visible');
        cy.get('[data-testid="search-item-container"]').should('be.visible').should('contain.text', '#hello');
    });
});