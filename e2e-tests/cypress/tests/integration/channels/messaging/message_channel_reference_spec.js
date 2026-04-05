import * as TIMEOUTS from '../../../fixtures/timeouts';
describe('Messaging', () => {
    before(() => {
        cy.apiInitSetup({loginAfter: true}).then(({offTopicUrl}) => {
            cy.visit(offTopicUrl);
        });
    });
    it('MM-T174 Autocomplete should close if tildes are deleted using backspace', () => {
        const msg = 'foo';
        cy.postMessage(msg);
        cy.uiGetPostTextBox().type('{uparrow}');
        cy.get('#edit_textbox').should('be.visible').wait(TIMEOUTS.HALF_SEC).type('{home}~');
        cy.get('#suggestionList').should('be.visible');
        cy.get('#edit_textbox').type('{home}{rightarrow}{backspace}');
        cy.get('#suggestionList').should('not.exist');
        cy.get('#edit_textbox').should('be.visible').wait(TIMEOUTS.HALF_SEC).type('{enter}');
    });
});