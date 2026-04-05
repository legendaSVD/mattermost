import * as TIMEOUTS from '../../../../fixtures/timeouts';
export function doReactToLastMessageShortcut(from) {
    if (from === 'CENTER') {
        cy.uiGetPostTextBox().
            focus().
            clear().
            cmdOrCtrlShortcut('{shift}\\');
    } else if (from === 'RHS') {
        cy.uiGetReplyTextBox().
            focus().
            clear().
            cmdOrCtrlShortcut('{shift}\\');
    } else {
        cy.get('body').cmdOrCtrlShortcut('{shift}\\');
    }
    cy.wait(TIMEOUTS.HALF_SEC);
}
export function checkReactionFromPost(postId, emoji = 'smile') {
    if (postId) {
        cy.get(`#${postId}_message`).within(() => {
            cy.findByLabelText('reactions').should('exist');
            cy.findByLabelText(`You reacted with :${emoji}:. Click to remove.`).should('exist');
        });
    } else {
        cy.findByLabelText('reactions').should('exist');
        cy.findByLabelText(`You reacted with :${emoji}:. Click to remove.`).should('exist');
    }
}
export function pressEscapeKey() {
    cy.get('body').type('{esc}');
}