import * as TIMEOUTS from '../../../fixtures/timeouts';
describe('Messaging', () => {
    before(() => {
        cy.apiInitSetup({loginAfter: true}).then(({offTopicUrl}) => {
            cy.visit(offTopicUrl);
        });
    });
    it('MM-T173 Edit post with "strikethrough" and ensure channel auto-complete closes after second tilde (~~)', () => {
        const message = 'Hello' + Date.now();
        cy.postMessage(message);
        cy.uiGetPostTextBox().clear().type('{uparrow}').wait(TIMEOUTS.HALF_SEC);
        cy.get('#edit_textbox').type('a{backspace}{home}~').wait(TIMEOUTS.HALF_SEC);
        cy.get('#suggestionList').should('exist');
        cy.get('#edit_textbox').type('{home}{rightarrow}~').wait(TIMEOUTS.HALF_SEC);
        cy.get('#suggestionList').should('not.exist');
        cy.get('#edit_textbox').type('{end} ~').wait(TIMEOUTS.HALF_SEC);
        cy.get('#suggestionList').should('exist');
        cy.get('#edit_textbox').type('{end}~').wait(TIMEOUTS.HALF_SEC);
        cy.get('#suggestionList').should('not.exist');
        cy.get('#edit_textbox').type('{end}{leftarrow}{leftarrow}{backspace}').wait(TIMEOUTS.HALF_SEC);
        cy.get('#suggestionList').should('not.exist');
        cy.get('#edit_textbox').wait(TIMEOUTS.HALF_SEC).type('{enter}');
        cy.getLastPostId().then((postId) => {
            cy.get(`#postMessageText_${postId}`).
                should('have.text', `${message} Edited`).
                find('del').
                should('contain', message);
        });
    });
});