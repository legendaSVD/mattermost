import * as TIMEOUTS from '../../../../fixtures/timeouts';
export function loginAndVisitChannel(user, channelUrl) {
    cy.apiLogin(user);
    cy.visit(channelUrl);
    cy.get('#postListContent', {timeout: TIMEOUTS.ONE_MIN}).should('be.visible');
    cy.uiGetPostTextBox();
}
export function verifyEphemeralMessage(message) {
    cy.wait(TIMEOUTS.HALF_SEC).getLastPostId().then((botLastPostId) => {
        cy.get(`#post_${botLastPostId}`).within(() => {
            cy.findByText('(Only visible to you)').should('exist');
            cy.findByText(message).should('exist');
        });
    });
}