import * as TIMEOUTS from '../../../fixtures/timeouts';
describe('Messaging', () => {
    before(() => {
        cy.apiInitSetup({loginAfter: true}).then(({offTopicUrl}) => {
            cy.visit(offTopicUrl);
        });
    });
    it('MM-T98 - Typing should show up right away when editing a message using the up arrow', () => {
        cy.postMessage('test post 1');
        cy.uiGetPostTextBox().type('{uparrow}');
        cy.get('#edit_textbox').type(' and test post 2').should('have.text', 'test post 1 and test post 2');
        cy.get('#edit_textbox').wait(TIMEOUTS.HALF_SEC).type('{enter}');
        cy.getLastPostId().then((postId) => {
            cy.get(`#postMessageText_${postId}`).should('have.text', 'test post 1 and test post 2 Edited');
        });
    });
});