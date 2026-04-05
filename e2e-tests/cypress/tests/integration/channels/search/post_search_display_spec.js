import * as TIMEOUTS from '../../../fixtures/timeouts';
describe('Search', () => {
    let testTeam;
    let testUser;
    before(() => {
        cy.apiInitSetup().then(({team, user}) => {
            testTeam = team;
            testUser = user;
        });
    });
    beforeEach(() => {
        cy.apiAdminLogin();
        cy.visit(`/${testTeam.name}/channels/town-square`);
    });
    it('MM-T353 After clearing search query, search options display', () => {
        const searchWord = 'Hello';
        cy.postMessage(searchWord);
        cy.uiGetSearchContainer().click();
        cy.uiGetSearchBox().type(searchWord + '{enter}');
        cy.uiGetSearchContainer().click();
        cy.uiGetSearchBox().should('have.value', searchWord);
        cy.uiGetSearchBox().parent().siblings('.input-clear-x').wait(TIMEOUTS.ONE_SEC).click({force: true});
        cy.uiGetSearchBox().parents('[class*="SearchInputContainer"]').siblings('#searchHints').should('be.visible');
        cy.uiGetSearchBox().focus().type('{esc}');
        cy.get('#search-items-container').should('be.visible');
        cy.uiGetSearchContainer().click();
        assertSearchHintFilesOrMessages();
    });
    it('MM-T376 - From:user search, using autocomplete', () => {
        const testMessage = 'Hello World';
        const testSearch = `FROM:${testUser.username.substring(0, 5)}`;
        cy.apiCreateUser().then(({user}) => {
            cy.apiAddUserToTeam(testTeam.id, user.id);
            cy.apiLogin(user);
            cy.apiGetChannelByName(testTeam.name, 'Off-Topic').then(({channel}) => {
                cy.postMessageAs({sender: testUser, message: testMessage, channelId: channel.id});
            });
            cy.visit(`/${testTeam.name}/channels/town-square`);
            cy.uiGetSearchContainer().click();
            cy.uiGetSearchBox().type(testSearch, {force: true}).wait(TIMEOUTS.HALF_SEC);
            cy.contains('.suggestion-list__item', `@${testUser.username}`).scrollIntoView().click({force: true});
            cy.uiGetSearchBox().should('have.value', `FROM:${testUser.username} `);
            cy.uiGetSearchBox().type('{enter}').wait(TIMEOUTS.HALF_SEC);
            cy.get('#search-items-container').should('be.visible');
            cy.uiGetSearchContainer().click();
            cy.get('.input-clear-x').first().trigger('mouseover', {force: true}).then(($span) => {
                cy.wrap($span).click({force: true});
                cy.get('[data-testid="search-item-container"]').should('be.visible');
            });
        });
    });
    it('MM-T1450 - Autocomplete behaviour', () => {
        cy.postMessage('hello');
        cy.uiGetSearchContainer().should('be.visible').click();
        assertSearchHintFilesOrMessages();
        cy.uiGetSearchBox().type('in:');
        cy.get('.suggestion-list__item').first().click({force: true});
        cy.get('.suggestion-list__item').should('not.exist');
        cy.get('.input-clear-x').first().click({force: true}).wait(TIMEOUTS.HALF_SEC);
        cy.uiGetSearchBox().type('in:town-square ').wait(TIMEOUTS.HALF_SEC);
        assertSearchHint();
        cy.uiGetSearchBox().get('.input-clear-x').click({force: true}).wait(TIMEOUTS.HALF_SEC);
        cy.uiGetSearchBox().type('in:town-square').wait(TIMEOUTS.HALF_SEC);
        cy.get('.suggestion-list__item').first().should('contain.text', 'Town Square~town-square');
        cy.uiGetSearchBox().type('{enter}');
        assertSearchHint();
        cy.uiGetSearchBox().should('have.value', 'in:town-square ');
        cy.uiGetSearchBox().type('{enter}').wait(TIMEOUTS.HALF_SEC);
        cy.get('.suggestion-list__item').should('not.exist');
    });
    it('MM-T2291 - Wildcard Search', () => {
        const testMessage = 'Hello World!!!';
        cy.postMessage(testMessage);
        cy.uiGetSearchContainer().click();
        cy.uiGetSearchBox().type('Hell*{enter}').wait(TIMEOUTS.HALF_SEC);
        cy.get('#search-items-container').should('be.visible');
        cy.get('[data-testid="search-item-container"]').should('be.visible');
        cy.get('.search-highlight').first().should('contain.text', 'Hell');
    });
});
const assertSearchHintFilesOrMessages = () => {
    cy.get('#searchHints').should('be.visible');
};
const assertSearchHint = () => {
    cy.get('#searchHints').should('be.visible');
};