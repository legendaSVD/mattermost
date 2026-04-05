describe('System Console', () => {
    let townSquareUrl;
    before(() => {
        cy.apiInitSetup().then((out) => {
            townSquareUrl = out.townSquareUrl;
        });
    });
    it('MM-T1100 Lock Teammate Name Display for all users', () => {
        cy.visit('/admin_console/site_config/users_and_teams');
        cy.findByTestId('TeamSettings.TeammateNameDisplaydropdown').select('nickname_full_name');
        cy.findByTestId('TeamSettings.LockTeammateNameDisplayfalse').click();
        cy.findByTestId('TeamSettings.LockTeammateNameDisplayhelp-text').contains('When true, disables users\' ability to change settings under Settings > Display > Teammate Name Display.').should('be.visible');
        cy.get('#saveSetting').click();
        cy.visit(townSquareUrl);
        cy.uiOpenSettingsModal('Display');
        cy.get('#name_formatEdit').click();
        cy.get('#name_formatFormatC').check();
        cy.uiSave();
        cy.get('#name_formatDesc').contains('Show first and last name').should('be.visible');
        cy.visit('/admin_console/site_config/users_and_teams');
        cy.findByTestId('TeamSettings.TeammateNameDisplaydropdown').select('username');
        cy.findByTestId('TeamSettings.LockTeammateNameDisplaytrue').click();
        cy.uiSave();
        cy.visit(townSquareUrl);
        cy.uiOpenSettingsModal('Display');
        cy.get('#name_formatDesc').contains('Show username').should('be.visible');
        cy.get('#name_formatEdit').click();
        cy.get('#extraInfo').contains('This field is handled through your System Administrator. If you want to change it, you need to do so through your System Administrator.').should('be.visible');
    });
});