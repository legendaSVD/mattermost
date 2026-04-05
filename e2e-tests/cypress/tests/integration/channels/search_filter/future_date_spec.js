import {getAdminAccount} from '../../../support/env';
import {
    searchAndValidate,
    getTestMessages,
    setupTestData,
} from './helpers';
describe('Search Date Filter', () => {
    const testData = getTestMessages();
    const {
        commonText,
        allMessagesInOrder,
    } = testData;
    const admin = getAdminAccount();
    let anotherAdmin;
    before(() => {
        cy.apiInitSetup({userPrefix: 'other-admin'}).then(({team, channel, user, channelUrl}) => {
            anotherAdmin = user;
            cy.visit(channelUrl);
            setupTestData(testData, {team, channel, admin, anotherAdmin});
        });
    });
    beforeEach(() => {
        cy.reload();
        cy.postMessage(Date.now());
    });
    it('MM-T605_1 before: using a date from the future shows results', () => {
        searchAndValidate(`before:2099-7-15 ${commonText}`, allMessagesInOrder);
    });
    it('MM-T605_2 on: using a date from the future shows no results', () => {
        searchAndValidate(`on:2099-7-15 ${commonText}`);
    });
    it('MM-T605_3 after: using a date from the future shows no results', () => {
        searchAndValidate(`after:2099-7-15 ${commonText}`);
    });
});