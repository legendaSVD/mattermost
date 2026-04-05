import * as TIMEOUTS from '../../../../fixtures/timeouts';
describe('System Console > Site Statistics', () => {
    before(() => {
        cy.shouldRunOnTeamEdition();
    });
    it('MM-T3804 Site Statistics displays expected content categories', () => {
        cy.visit('/admin_console/reporting/system_analytics');
        cy.get('.admin-console__header span', {timeout: TIMEOUTS.ONE_MIN}).should('be.visible').should('contain', 'System Statistics');
        cy.get('.admin-console__content .row').should('have.length', 4);
        cy.get('.admin-console__content .row').eq(0).find('.title').eq(0).should('contain', 'Total Active Users');
        cy.get('.admin-console__content .row').eq(0).find('.title').eq(1).should('contain', 'Total Teams');
        cy.get('.admin-console__content .row').eq(0).find('.title').eq(2).should('contain', 'Total Channels');
        cy.get('.admin-console__content .row').eq(0).find('.title').eq(3).should('contain', 'Total Posts');
        cy.get('.admin-console__content .row').eq(0).find('.title').eq(4).should('contain', 'Daily Active Users');
        cy.get('.admin-console__content .row').eq(0).find('.title').eq(5).should('contain', 'Monthly Active Users');
        cy.get('.admin-console__content .row').eq(0).find('.content').each((el) => {
            cy.waitUntil(() => cy.wrap(el).then((content) => {
                return content[0].innerText !== 'Loading...';
            }));
            cy.wrap(el).eq(0).invoke('text').then(parseFloat).should('be.gt', 0);
        });
    });
});