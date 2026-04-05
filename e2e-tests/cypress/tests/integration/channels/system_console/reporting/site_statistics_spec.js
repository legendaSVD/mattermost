import * as TIMEOUTS from '../../../../fixtures/timeouts';
describe('System Console > Site Statistics', () => {
    let testUser;
    before(() => {
        cy.shouldNotRunOnCloudEdition();
        cy.apiInitSetup({loginAfter: true}).then(({user, offTopicUrl}) => {
            testUser = user;
            cy.visit(offTopicUrl);
            cy.postMessage('New Daily Message');
        });
    });
    it('MM-T903 - Site Statistics > Deactivating a user increments the Daily and Monthly Active Users counts down', () => {
        let totalActiveUsersInitial;
        let dailyActiveUsersInitial;
        let monthlyActiveUsersInitial;
        let totalActiveUsersFinal;
        let dailyActiveUsersFinal;
        let monthlyActiveUsersFinal;
        cy.apiAdminLogin();
        cy.visit('/admin_console');
        cy.findByTestId('reporting.system_analytics', {timeout: TIMEOUTS.ONE_MIN}).click();
        cy.wait(TIMEOUTS.ONE_SEC);
        cy.findByTestId('totalActiveUsers').invoke('text').then((totalActiveText) => {
            totalActiveUsersInitial = parseInt(totalActiveText, 10);
        });
        cy.findByTestId('dailyActiveUsers').invoke('text').then((dailyActiveText) => {
            dailyActiveUsersInitial = parseInt(dailyActiveText, 10);
        });
        cy.findByTestId('monthlyActiveUsers').invoke('text').then((monthlyActiveText) => {
            monthlyActiveUsersInitial = parseInt(monthlyActiveText, 10);
            cy.externalActivateUser(testUser.id, false);
            cy.reload();
            cy.wait(TIMEOUTS.TWO_SEC);
        });
        cy.findByTestId('totalActiveUsers').invoke('text').then((totalActiveFinalText) => {
            totalActiveUsersFinal = parseInt(totalActiveFinalText, 10);
        });
        cy.findByTestId('dailyActiveUsers').invoke('text').then((dailyActiveFinalText) => {
            dailyActiveUsersFinal = parseInt(dailyActiveFinalText, 10);
        });
        cy.findByTestId('monthlyActiveUsers').invoke('text').then((monthlyActiveFinalText) => {
            monthlyActiveUsersFinal = parseInt(monthlyActiveFinalText, 10);
            expect(totalActiveUsersFinal).equal(totalActiveUsersInitial - 1);
            expect(dailyActiveUsersFinal).equal(dailyActiveUsersInitial - 1);
            expect(monthlyActiveUsersFinal).equal(monthlyActiveUsersInitial - 1);
        });
    });
});