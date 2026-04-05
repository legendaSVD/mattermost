describe('Keyboard Shortcuts', () => {
    before(() => {
        cy.apiInitSetup({loginAfter: true}).then(({channelUrl}) => {
            cy.visit(channelUrl);
        });
    });
    it('MM-T1249 CTRL/CMD+SHIFT+L - Set focus to center channel message box (with REPLY RHS open)', () => {
        cy.postMessage('Hello World!');
        cy.getLastPostId().then((postId) => {
            cy.clickPostDotMenu(postId);
            cy.findByText('Reply').click();
            cy.uiGetReplyTextBox().should('be.focused');
            cy.get('#rhsCloseButton').should('exist');
            cy.get('body').cmdOrCtrlShortcut('{shift}L');
            cy.uiGetPostTextBox().should('be.focused');
        });
    });
    it('MM-T1250 CTRL/CMD+SHIFT+L - Set focus to center channel message box (with SEARCH RHS open)', () => {
        cy.uiGetSearchContainer().click();
        cy.uiGetSearchBox().type('test{enter}');
        cy.contains('.sidebar--right__header', 'Search Results').should('be.visible');
        cy.get('body').cmdOrCtrlShortcut('{shift}L');
        cy.uiGetPostTextBox().should('be.focused');
    });
});