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
        firstDateEarly,
        todayMessage,
        secondOffTopicMessage,
        secondMessage,
    } = testData;
    const admin = getAdminAccount();
    let anotherAdmin;
    let channelName;
    before(() => {
        cy.apiInitSetup({userPrefix: 'other-admin'}).then(({team, channel, user, channelUrl}) => {
            anotherAdmin = user;
            channelName = channel.name;
            cy.visit(channelUrl);
            setupTestData(testData, {team, channel, admin, anotherAdmin});
        });
    });
    beforeEach(() => {
        cy.reload();
        cy.postMessage(Date.now());
    });
    it('MM-T587 after: omits results before and on target date', () => {
        searchAndValidate(`after:${firstDateEarly.query} ${commonText}`, [todayMessage, secondOffTopicMessage, secondMessage]);
    });
    it('MM-T592_1 after: can be used in conjunction with in:', () => {
        searchAndValidate(`after:${firstDateEarly.query} in:${channelName} ${commonText}`, [todayMessage, secondMessage]);
    });
    it('MM-T592_2 after: can be used in conjunction with from:', () => {
        searchAndValidate(`after:${firstDateEarly.query} from:${anotherAdmin.username} ${commonText}`, [secondOffTopicMessage]);
    });
    it('MM-T592_3 after: re-add "in:" in conjunction with "from:"', () => {
        searchAndValidate(`after:${firstDateEarly.query} in:${channelName} ${commonText} from:${anotherAdmin.username} ${commonText}`);
    });
});