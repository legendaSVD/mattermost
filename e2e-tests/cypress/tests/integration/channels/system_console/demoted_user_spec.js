import * as TIMEOUTS from '../../../fixtures/timeouts';
describe('System Console', () => {
    let testUser;
    before(() => {
        cy.apiInitSetup({loginAfter: true}).then(({user}) => {
            testUser = user;
        });
    });
    it('MM-T922 Demoted user cannot continue to view System Console', () => {
        cy.externalUpdateUserRoles(testUser.id, 'system_user system_admin');
        cy.visit('/admin_console/reporting/system_analytics');
        cy.get('#adminConsoleWrapper').should('be.visible');
        cy.url().should('include', '/admin_console/reporting/system_analytics');
        cy.externalUpdateUserRoles(testUser.id, 'system_user');
        cy.get('#adminConsoleWrapper').should('not.exist');
        cy.get('#postListContent', {timeout: TIMEOUTS.HALF_MIN}).should('be.visible');
        cy.url().should('include', 'town-square');
    });
});