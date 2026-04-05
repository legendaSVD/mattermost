import * as TIMEOUTS from '../../../fixtures/timeouts';
import {adminConsoleNavigation} from '../../../utils/admin_console';
describe('System Console - Team', () => {
    before(() => {
        cy.shouldRunOnTeamEdition();
        cy.visit('/admin_console/about/license');
        cy.url().should('include', '/admin_console/about/license');
        cy.get('.admin-console__header', {timeout: TIMEOUTS.ONE_MIN}).
            should('be.visible').
            and('have.text', 'Edition and License');
    });
    const serverType = 'team';
    adminConsoleNavigation.forEach((testCase, index) => {
        const canNavigate = testCase.type.includes(serverType);
        const testTitle = `MM-T4263_${index + 1} ${canNavigate ? 'can' : 'cannot'} navigate to ${testCase.team_header || testCase.header}`;
        const testFn = canNavigate ? verifyCanNavigate : verifyCannotNavigate;
        it(testTitle, () => {
            testFn(testCase);
        });
    });
});
function verifyCanNavigate(testCase) {
    cy.get('.admin-sidebar', {timeout: TIMEOUTS.ONE_MIN}).
        should('be.visible').
        findByText(testCase.sidebar).
        scrollIntoView().
        should('be.visible').
        click();
    cy.url().should('include', testCase.url);
    cy.get('.admin-console__header', {timeout: TIMEOUTS.ONE_MIN}).
        should('be.visible').
        and(testCase.headerContains ? 'contain' : 'have.text', testCase.team_header || testCase.header);
}
function verifyCannotNavigate(testCase) {
    cy.get('.admin-sidebar', {timeout: TIMEOUTS.ONE_MIN}).
        should('be.visible').
        findByText(testCase.sidebar).
        should('not.exist');
    cy.visit(testCase.url);
    cy.url().should('include', '/admin_console/about/license');
}