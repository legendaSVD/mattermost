import * as TIMEOUTS from '../../../fixtures/timeouts';
import {getRandomId} from '../../../utils';
export function visitTownSquareAndWaitForPageToLoad() {
    cy.get('#sidebarItem_town-square').should('be.visible').click();
    cy.get('#channelHeaderTitle').should('be.visible').and('have.text', 'Town Square');
    cy.findAllByTestId('postView').should('be.visible');
}
export function scrollUpAndPostAMessage(sender, channelId, nTimes = 1) {
    scrollUp();
    const randomId = getRandomId();
    Cypress._.times(nTimes, (num) => {
        cy.postMessageAs({sender, message: `${num} ${randomId}`, channelId});
    });
}
export function scrollDown() {
    cy.get('div.post-list__dynamic').should('be.visible').
        scrollTo('bottom', {duration: TIMEOUTS.ONE_SEC}).
        wait(TIMEOUTS.ONE_SEC);
}
export function scrollUp() {
    cy.get('div.post-list__dynamic').should('be.visible').
        scrollTo(0, '70%', {duration: TIMEOUTS.ONE_SEC}).
        wait(TIMEOUTS.ONE_SEC);
}
export function scrollToTop() {
    cy.get('div.post-list__dynamic').should('be.visible').
        scrollTo(0, 0, {duration: TIMEOUTS.ONE_SEC}).
        wait(TIMEOUTS.ONE_SEC);
}