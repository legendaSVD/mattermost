describe('Keyboard Shortcuts', () => {
    before(() => {
        cy.apiInitSetup({loginAfter: true}).then(({channelUrl}) => {
            cy.visit(channelUrl);
        });
    });
    it('MM-T1251 CTRL/CMD+SHIFT+L - When not to set focus to center channel message box', () => {
        cy.uiOpenSettingsModal();
        cy.get('body').cmdOrCtrlShortcut('{shift+l}');
        cy.uiGetPostTextBox().should('not.be.focused');
        cy.uiClose();
        cy.findByLabelText('Invite Users').click();
        cy.get('body').cmdOrCtrlShortcut('{shift+l}');
        cy.uiGetPostTextBox().should('not.be.focused');
        cy.uiClose();
    });
});