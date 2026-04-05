describe('Archive channel header spec', () => {
    before(() => {
        cy.visit('/admin_console/user_management/permissions/system_scheme');
        cy.findByTestId('resetPermissionsToDefault').click();
        cy.get('#confirmModalButton').click();
        cy.findByTestId('all_users-public_channel-convert_public_channel_to_private-checkbox').then((el) => {
            if (!el.hasClass('checked')) {
                el.click();
            }
        });
        cy.uiSave();
        cy.uiSaveButton().should('be.visible');
        cy.apiInitSetup({loginAfter: true}).then(({channelUrl}) => {
            cy.visit(channelUrl);
        });
    });
    it('MM-T1717 Archived channel details cannot be edited', () => {
        cy.get('#channelHeaderTitle').click();
        cy.get('#channelLeaveChannel').should('be.visible');
        cy.get('#channelSettings').should('be.visible');
        cy.get('#channelArchiveChannel').should('be.visible');
        cy.get('#channelMembers').should('be.visible');
        cy.get('#channelNotificationPreferences').should('be.visible');
        cy.get('body').type('{esc}{esc}');
        cy.uiArchiveChannel();
        cy.get('#channelHeaderTitle').click();
        cy.get('#channelArchiveChannel').should('not.exist');
        cy.get('#channelSettings').should('not.exist');
        cy.get('#channelMembers').should('be.visible');
        cy.get('#channelNotificationPreferences').should('not.exist');
        cy.get('body').type('{esc}{esc}');
    });
});