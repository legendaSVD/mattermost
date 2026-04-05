import * as TIMEOUTS from '../../../fixtures/timeouts';
import * as MESSAGES from '../../../fixtures/messages';
describe('Messaging', () => {
    before(() => {
        cy.apiInitSetup({loginAfter: true}).then(({offTopicUrl}) => {
            cy.visit(offTopicUrl);
        });
    });
    it('At-mention user autocomplete should open above the textbox in RHS when only one message is present', () => {
        cy.postMessage(MESSAGES.TINY);
        cy.clickPostCommentIcon();
        cy.get('#rhsContainer').should('be.visible');
        cy.uiGetReplyTextBox().clear().type('@');
        cy.uiGetReplyTextBox().then((replyTextbox) => {
            cy.get('#suggestionList').then((suggestionList) => {
                expect(replyTextbox[0].getBoundingClientRect().top).to.be.greaterThan(suggestionList[0].getBoundingClientRect().top);
            });
        });
        cy.uiCloseRHS();
    });
    it('At-mention user autocomplete should open above the textbox in RHS is filled with messages', () => {
        cy.postMessage(MESSAGES.TINY);
        cy.clickPostCommentIcon();
        cy.get('#rhsContainer').should('be.visible');
        Cypress._.times(2, () => {
            cy.uiGetReplyTextBox().
                clear().
                invoke('val', MESSAGES.HUGE).
                wait(TIMEOUTS.ONE_SEC).
                type(' {backspace}{enter}');
        });
        cy.uiGetReplyTextBox().clear().type('@');
        cy.uiGetReplyTextBox().then((replyTextbox) => {
            cy.get('#suggestionList').then((suggestionList) => {
                expect(replyTextbox[0].getBoundingClientRect().top).to.be.greaterThan(suggestionList[0].getBoundingClientRect().top);
            });
        });
        cy.uiCloseRHS();
    });
    it('MM-T70_1 At-mention user autocomplete is legible when it overlaps with channel header when drafting a long message containing a file attachment', () => {
        uploadFileAndAddAutocompleteThenVerifyNoOverlap();
    });
    it('MM-T70_2 At-mention user autocomplete is legible when it overlaps with channel header when drafting a long message containing a file attachment (1280x900 viewport)', () => {
        cy.viewport(1280, 900);
        uploadFileAndAddAutocompleteThenVerifyNoOverlap();
    });
});
function uploadFileAndAddAutocompleteThenVerifyNoOverlap() {
    cy.get('#fileUploadInput').attachFile('mattermost-icon.png');
    cy.uiGetPostTextBox().clear();
    let message = 'h{shift}';
    for (let i = 0; i < 12; i++) {
        message += '{enter}h';
    }
    cy.uiGetPostTextBox().type(message);
    cy.uiGetPostTextBox().type('{shift}{enter}').type('@');
    cy.get('#channel-header').should('be.visible').then((header) => {
        cy.get('#suggestionList').should('be.visible').then((list) => {
            cy.wait(TIMEOUTS.HALF_SEC).then(() => {
                cy.wrap(header[0].getBoundingClientRect().top).should('be.lt', list[0].getBoundingClientRect().top);
                cy.wrap(header[0].getBoundingClientRect().bottom).should('be.lt', list[0].getBoundingClientRect().top);
            });
        });
    });
}