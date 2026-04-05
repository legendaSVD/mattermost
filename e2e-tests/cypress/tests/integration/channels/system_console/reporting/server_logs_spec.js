import * as TIMEOUTS from '../../../../fixtures/timeouts';
describe('System Console > Server Logs', () => {
    before(() => {
        cy.shouldNotRunOnCloudEdition();
        cy.visit('/admin_console');
        cy.get('#reporting\\/server_logs').click().wait(TIMEOUTS.TWO_SEC);
    });
    it('MM-T908 Logs - Verify content categories', () => {
        cy.get('.banner__content span').should('not.empty');
        cy.get('.admin-logs-content button span').should('be.visible').and('contain', 'Reload');
        cy.get('.admin-logs-content div.LogTable').should('be.visible').and('not.empty');
        cy.get('.admin-logs-content div.LogTable span').eq(0).should('not.empty');
    });
});