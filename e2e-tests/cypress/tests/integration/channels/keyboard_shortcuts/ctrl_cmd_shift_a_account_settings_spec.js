describe('Keyboard Shortcuts', () => {
    before(() => {
        cy.apiInitSetup().then(({channelUrl}) => {
            cy.visit(channelUrl);
        });
    });
    it('MM-T4441_1 CTRL/CMD+SHIFT+A - Settings should open in desktop view', () => {
        cy.uiGetPostTextBox().cmdOrCtrlShortcut('{shift}A');
        cy.get('#accountSettingsModal').should('be.visible');
        cy.uiClose();
    });
    it('MM-T4441_2 CTRL/CMD+SHIFT+A - Settings should open in mobile view view', () => {
        cy.viewport('iphone-6');
        cy.uiGetPostTextBox().cmdOrCtrlShortcut('{shift}A');
        cy.get('#accountSettingsModal').should('be.visible');
        cy.uiClose();
    });
    it('CTRL+A - Should not open Settings', () => {
        cy.uiGetPostTextBox().cmdOrCtrlShortcut('A');
        cy.get('#accountSettingsModal').should('not.exist');
    });
});