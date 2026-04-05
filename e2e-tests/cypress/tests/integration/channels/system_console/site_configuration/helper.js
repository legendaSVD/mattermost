import * as TIMEOUTS from '../../../../fixtures/timeouts';
export function saveSetting() {
    cy.get('#saveSetting').
        should('have.text', 'Save').
        and('be.enabled').
        click().
        should('be.disabled').
        wait(TIMEOUTS.HALF_SEC);
}
export function backToTeam() {
    cy.get('.backstage-navbar__back').click();
}