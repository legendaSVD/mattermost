import {getAdminAccount} from '../../../support/env';
import * as TIMEOUTS from '../../../fixtures/timeouts';
import {
    getTestMessages,
    searchAndValidate,
    setupTestData,
} from './helpers';
describe('Search Date Filter', () => {
    const testData = getTestMessages();
    const {
        commonText,
        allMessagesInOrder,
        todayMessage,
        firstMessage,
    } = testData;
    const admin = getAdminAccount();
    let anotherAdmin;
    before(() => {
        cy.apiInitSetup({userPrefix: 'other-admin'}).then(({team, channel, channelUrl, user}) => {
            anotherAdmin = user;
            cy.visit(channelUrl);
            setupTestData(testData, {team, channel, admin, anotherAdmin});
        });
    });
    it('MM-T585_1 Unfiltered search for all posts is not affected', () => {
        searchAndValidate(commonText, allMessagesInOrder);
    });
    it('MM-T585_2 Unfiltered search for recent post is not affected', () => {
        searchAndValidate(todayMessage, [todayMessage]);
    });
    it.skip('MM-T596 Use calendar picker to set date', () => {
        const today = Cypress.dayjs().format('YYYY-MM-DD');
        cy.uiGetSearchContainer().should('be.visible').click();
        cy.uiGetSearchBox().clear().type('before:');
        cy.get('.rdp').
            as('dayPicker').
            should('be.visible');
        cy.get('@dayPicker').
            find('.rdp-day_today').click();
        cy.get('@dayPicker').should('not.exist');
        cy.uiGetSearchBox().should('have.value', `before:${today} `);
        cy.uiGetSearchBox().parent('.input-wrapper').siblings('.input-clear-x').click({force: true});
        cy.uiGetSearchBox().should('have.value', '');
        cy.uiGetSearchContainer().should('be.visible').click();
    });
    it.skip('MM-T3997 Backspace after last character of filter makes calendar reappear', () => {
        const today = Cypress.dayjs().format('YYYY-MM-DD');
        cy.uiGetSearchContainer().should('be.visible').click();
        cy.uiGetSearchBox().clear().type('before:');
        cy.get('.rdp').
            as('dayPicker').
            should('be.visible');
        cy.get('@dayPicker').
            find('.rdp-day_today').click();
        cy.get('@dayPicker').should('not.exist');
        cy.uiGetSearchBox().
            should('have.value', `before:${today} `).
            focus().
            type('{backspace}');
        cy.get('@dayPicker').should('be.visible');
    });
    it.skip('MM-T598 Dates work without leading 0 for date and month', () => {
        const testCases = [
            {name: 'day', date: '2018-06-5'},
            {name: 'month', date: '2018-6-05'},
            {name: 'month and date', date: '2018-6-5'},
        ];
        testCases.forEach((test) => {
            cy.reload();
            searchAndValidate(`on:${test.date} "${firstMessage}"`, [firstMessage]);
        });
    });
    it.skip('MM-T601 Remove date filter with keyboard', () => {
        const queryString = `on:${Cypress.dayjs().format('YYYY-MM-DD')} ${commonText}`;
        cy.uiGetSearchContainer().should('be.visible').click();
        cy.uiGetSearchBox().
            clear().
            wait(TIMEOUTS.HALF_SEC).
            type(queryString).
            type('{backspace}'.repeat(queryString.length)).
            should('have.value', '');
        cy.uiGetSearchBox().clear().wait(TIMEOUTS.HALF_SEC).type(queryString);
        cy.uiGetSearchBox().parent('.input-wrapper').siblings('.input-clear-x').click({force: true});
        cy.uiGetSearchBox().should('have.value', '');
    });
});