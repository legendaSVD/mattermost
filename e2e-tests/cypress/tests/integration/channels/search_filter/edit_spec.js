import {getAdminAccount} from '../../../support/env';
import {
    getMsAndQueryForDate,
    getTestMessages,
    searchAndValidate,
    setupTestData,
} from './helpers';
describe('Search Date Filter', () => {
    const testData = getTestMessages();
    const admin = getAdminAccount();
    let anotherAdmin;
    let channelUrl;
    let channelId;
    before(() => {
        cy.apiInitSetup({userPrefix: 'other-admin'}).
            then(({team, channel, user, channelUrl: url}) => {
                anotherAdmin = user;
                channelUrl = url;
                channelId = channel.id;
                cy.visit(channelUrl);
                setupTestData(testData, {team, channel, admin, anotherAdmin});
            });
    });
    beforeEach(() => {
        cy.reload();
        cy.postMessage(Date.now());
    });
    it('MM-T599 Edit date and search again', () => {
        const targetMessage = 'calendarUpdate' + Date.now();
        const targetDate = getMsAndQueryForDate(Date.UTC(2019, 0, 15, 9, 30));
        cy.postMessageAs({sender: admin, message: targetMessage, channelId, createAt: targetDate.ms});
        cy.clock(targetDate.ms, ['Date']);
        cy.reload();
        cy.uiGetSearchBox().click().clear().type('on:');
        cy.get('.DayPicker').
            as('dayPicker').
            should('be.visible');
        cy.get('@dayPicker').
            find('.DayPicker-Day--today').click();
        cy.uiGetSearchBox().
            should('have.value', 'on:2019-01-15 ').
            click().
            type(`${targetMessage}{enter}`).
            should('be.empty');
        cy.get('#loadingSpinner').should('not.exist');
        cy.uiGetRHSSearchContainer().
            findAllByTestId('search-item-container').
            should('be.visible').
            and('have.length', 1).
            find('.post-message').
            should('have.text', targetMessage);
        cy.visit(channelUrl);
        cy.postMessage(Date.now());
        cy.uiGetSearchBox().click().clear().
            type(`on:2019-01-15 ${targetMessage}`).
            type('{leftarrow}'.repeat(targetMessage.length + 1)).
            type('{backspace}');
        cy.get('@dayPicker').should('be.visible');
        cy.get('@dayPicker').
            find('.DayPicker-Day--today').
            next('.DayPicker-Day').click();
        cy.uiGetSearchBox().
            should('have.value', `on:2019-01-16  ${targetMessage}`).
            click().
            type('{enter}').
            should('be.empty');
        cy.get('#loadingSpinner').should('not.exist');
        cy.uiGetRHSSearchContainer().
            findAllByTestId('search-item-container').
            should('have.length', 0);
    });
    it('MM-T595 Changing timezone changes day search results appears', () => {
        const identifier = 'timezone' + Date.now();
        const target = getMsAndQueryForDate(Date.UTC(2018, 9, 31, 23, 59));
        const targetMessage = 'targetAM ' + identifier;
        cy.postMessageAs({sender: admin, message: targetMessage, channelId, createAt: target.ms});
        searchAndValidate(`on:${target.query} ${identifier}`, [targetMessage]);
        changeTimezone('Europe/Brussels');
        searchAndValidate(`on:${target.query} ${identifier}`);
    });
});
function changeTimezone(timezone) {
    cy.apiPatchMe({timezone: {automaticTimezone: '', manualTimezone: timezone, useAutomaticTimezone: 'false'}});
}