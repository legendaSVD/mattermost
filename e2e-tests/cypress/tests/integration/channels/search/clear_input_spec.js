import * as TIMEOUTS from '../../../fixtures/timeouts';
import * as MESSAGES from '../../../fixtures/messages';
describe('Search', () => {
    before(() => {
        cy.apiInitSetup({loginAfter: true}).then(({offTopicUrl}) => {
            cy.visit(offTopicUrl);
        });
    });
    it('QuickInput clear X', () => {
        cy.uiGetSearchContainer().find('.input-clear-x').should('not.exist');
        cy.uiGetSearchContainer().click();
        cy.uiGetSearchBox().clear().wait(TIMEOUTS.HALF_SEC).type('abc').wait(TIMEOUTS.HALF_SEC).type('{enter}');
        cy.uiGetSearchContainer().click();
        cy.uiGetSearchBox().should('have.value', 'abc');
        cy.get('#searchBox .icon-close').click();
        cy.uiGetSearchContainer().
            find('.input-clear-x').
            should('be.visible').
            click({force: true});
        cy.uiGetSearchContainer().find('.input-clear-x').should('not.exist');
        cy.uiGetSearchContainer().click();
        cy.uiGetSearchBox().should('have.value', '');
    });
    it('MM-T368 - Text in search box should not clear when Pinned or Saved posts icon is clicked', () => {
        const searchText = MESSAGES.SMALL;
        cy.uiGetSearchContainer().click();
        cy.uiGetSearchBox().clear().wait(TIMEOUTS.HALF_SEC).type(searchText + '{enter}').wait(TIMEOUTS.HALF_SEC);
        cy.uiGetSavedPostButton().click();
        cy.uiGetRHS().should('contain', 'Saved messages');
    });
});