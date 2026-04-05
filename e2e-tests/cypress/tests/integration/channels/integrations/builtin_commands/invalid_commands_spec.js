import * as MESSAGES from '../../../../fixtures/messages';
describe('Invalid slash command', () => {
    const incorrectCommand1 = 'notacommand-1';
    const incorrectCommand2 = 'notacommand-2';
    const incorrectCommand3 = 'notacommand-3';
    before(() => {
        cy.apiInitSetup({loginAfter: true}).then(({offTopicUrl}) => {
            cy.visit(offTopicUrl);
            cy.postMessage('hello');
        });
    });
    it('MM-T667 - Start message with slash and non-command', () => {
        cy.uiGetPostTextBox().type(`/${incorrectCommand1} {enter}`);
        verifyNonCommandErrorMessageIsDisplayed(incorrectCommand1);
        cy.focused().should('have.id', 'post_textbox');
        cy.uiGetPostTextBox().type('{backspace}');
        verifyNonCommandErrorMessageIsNotDisplayed(incorrectCommand1);
        cy.uiGetPostTextBox().clear().type(`/${incorrectCommand2} {enter}`);
        verifyNonCommandErrorMessageIsDisplayed(incorrectCommand2);
        cy.findByText('Click here to send as a message.').click({force: true});
        verifyLastPostedMessageContainsPlainTextOfCommand(incorrectCommand2);
        cy.uiGetPostTextBox().clear().type(`/${incorrectCommand3} {enter}`);
        verifyNonCommandErrorMessageIsDisplayed(incorrectCommand3);
        cy.uiGetPostTextBox().type('{enter}');
        verifyLastPostedMessageContainsPlainTextOfCommand(incorrectCommand3);
    });
    it('MM-T668 Start reply with slash and non-command', () => {
        cy.postMessage(MESSAGES.SMALL);
        cy.getLastPostId().then((lastPostID) => {
            cy.clickPostCommentIcon(lastPostID);
            cy.postMessageReplyInRHS(MESSAGES.TINY);
        });
        cy.uiGetReplyTextBox().type(`/${incorrectCommand1} {enter}`);
        cy.get('#rhsContainer').within(() => {
            verifyNonCommandErrorMessageIsDisplayed(incorrectCommand1);
        });
        cy.focused().
            should('have.id', 'reply_textbox').
            and('not.have.id', 'post_textbox');
        cy.uiGetReplyTextBox().type('{backspace}');
        cy.get('#rhsContainer').within(() => {
            verifyNonCommandErrorMessageIsNotDisplayed(incorrectCommand1);
        });
        cy.uiGetReplyTextBox().clear().type(`/${incorrectCommand2} {enter}`);
        cy.get('#rhsContainer').within(() => {
            verifyNonCommandErrorMessageIsDisplayed(incorrectCommand2);
        });
        cy.uiGetReplyTextBox().type('{enter}');
        verifyLastPostedMessageContainsPlainTextOfCommand(incorrectCommand2);
        cy.uiGetReplyTextBox().clear().type(`/${incorrectCommand3} {enter}`);
        cy.get('#rhsContainer').within(() => {
            verifyNonCommandErrorMessageIsDisplayed(incorrectCommand3);
        });
        cy.findByText('Click here to send as a message.').should('exist').click({force: true});
        verifyLastPostedMessageContainsPlainTextOfCommand(incorrectCommand3);
        cy.uiCloseRHS();
    });
});
function verifyNonCommandErrorMessageIsDisplayed(nonCommand) {
    cy.findByText(`Command with a trigger of '/${nonCommand}' not found.`);
    cy.findByText('Click here to send as a message.');
}
function verifyNonCommandErrorMessageIsNotDisplayed(nonCommand) {
    cy.findByText(`Command with a trigger of '/${nonCommand}' not found.`).should('not.exist');
    cy.findByText('Click here to send as a message.').should('not.exist');
}
function verifyLastPostedMessageContainsPlainTextOfCommand(nonCommand) {
    cy.getLastPost().within(() => {
        cy.findByText(`/${nonCommand}`);
    });
}