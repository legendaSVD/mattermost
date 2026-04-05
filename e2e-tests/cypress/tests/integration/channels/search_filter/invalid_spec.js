import {getAdminAccount} from '../../../support/env';
import {
    getTestMessages,
    searchAndValidate,
    setupTestData,
} from './helpers';
describe('Search Date Filter', () => {
    const testData = getTestMessages();
    const {commonText} = testData;
    const admin = getAdminAccount();
    let anotherAdmin;
    before(() => {
        cy.apiInitSetup({userPrefix: 'other-admin'}).then(({team, channel, user, channelUrl}) => {
            anotherAdmin = user;
            cy.visit(channelUrl);
            setupTestData(testData, {team, channel, admin, anotherAdmin});
        });
    });
    it('MM-T602_1 wrong format returns no results', () => {
        searchAndValidate(`before:123-456-789 ${commonText}`);
    });
    it('MM-T602_2 correct format, invalid date returns no results', () => {
        searchAndValidate(`before:2099-15-45 ${commonText}`);
    });
    it('MM-T602_3 invalid leap year returns no results', () => {
        searchAndValidate(`after:2018-02-29 ${commonText}`);
    });
    it('MM-T602_4 using invalid string for date returns no results', () => {
        searchAndValidate(`before:banana ${commonText}`);
    });
});