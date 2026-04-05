import {getAdminAccount} from '../../../support/env';
import {
    getTestMessages,
    searchAndValidate,
    setupTestData,
} from './helpers';
describe('Search Date Filter', () => {
    const testData = getTestMessages();
    const {
        commonText,
        firstDateEarly,
        secondMessage,
        secondOffTopicMessage,
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
    it('MM-T589 "before:" and "after:" can be used together', () => {
        searchAndValidate(`before:${Cypress.dayjs().format('YYYY-MM-DD')} after:${firstDateEarly.query} ${commonText}`, [secondOffTopicMessage, secondMessage]);
    });
    it('MM-T593 "before:", "after:", "from:", and "in:" can be used in one search', () => {
        searchAndValidate(`before:${Cypress.dayjs().format('YYYY-MM-DD')} after:${firstDateEarly.query} from:${anotherAdmin.username} in:off-topic ${commonText}`, [secondOffTopicMessage]);
    });
    it('MM-T603 Place a string when a date is expected', () => {
        searchAndValidate(`on:hippo ${commonText}`, []);
        searchAndValidate(`before:hippo ${commonText}`, []);
        searchAndValidate(`after:hippo ${commonText}`, []);
    });
});