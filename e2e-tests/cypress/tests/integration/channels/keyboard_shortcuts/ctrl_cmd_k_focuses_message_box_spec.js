import * as TIMEOUTS from '../../../fixtures/timeouts';
describe('Keyboard Shortcuts', () => {
    before(() => {
        cy.apiInitSetup({loginAfter: true}).then(({channelUrl}) => {
            cy.visit(channelUrl);
        });
    });
    it('MM-T1243 CTRL/CMD+K - Open public channel using arrow keys and Enter, click out of current channel message box first', () => {
        cy.get('#postListContent').click();
        cy.uiGetPostTextBox().should('not.be.focused');
        cy.get('body').cmdOrCtrlShortcut('K');
        cy.get('#quickSwitchInput').type('T');
        cy.get('#suggestionList').findByTestId('town-square').should('be.visible').and('have.class', 'suggestion--selected');
        cy.wait(TIMEOUTS.HALF_SEC);
        cy.get('body').type('{downarrow}');
        cy.get('#suggestionList').findByTestId('off-topic').should('be.visible').and('have.class', 'suggestion--selected');
        cy.get('body').type('{enter}');
        cy.contains('#channelHeaderTitle', 'Off-Topic');
        cy.uiGetPostTextBox().should('be.focused');
    });
});