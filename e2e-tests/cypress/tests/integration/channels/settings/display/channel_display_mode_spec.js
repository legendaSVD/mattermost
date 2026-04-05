describe('Settings > Display > Channel Display Mode', () => {
    before(() => {
        cy.apiInitSetup({loginAfter: true}).then(({offTopicUrl}) => {
            cy.visit(offTopicUrl);
            cy.postMessage('Test for channel display mode');
        });
    });
    beforeEach(() => {
        cy.viewport(1500, 660);
    });
    it('should render in min setting view', () => {
        cy.uiOpenSettingsModal('Display');
        cy.get('#displayButton').should('be.visible');
        cy.get('#displayButton').click();
        cy.get('#displaySettingsTitle').should('contain', 'Display Settings');
        cy.get('#channel_display_modeTitle').scrollIntoView();
        cy.get('#channel_display_modeTitle').should('contain', 'Channel Display');
        cy.get('#channel_display_modeDesc').should('contain', 'Full width');
        cy.get('#channel_display_modeEdit').should('contain', 'Edit');
    });
    it('should render in max setting view', () => {
        cy.get('#channel_display_modeEdit').click();
        cy.get('.section-max').scrollIntoView();
        cy.get('#channel_display_modeFormatA').should('be.visible');
        cy.get('#channel_display_modeFormatB').should('be.visible');
        cy.get('#saveSetting').should('contain', 'Save');
        cy.get('#cancelSetting').should('contain', 'Cancel');
    });
    it('MM-T296 change channel display mode setting to "Full width"', () => {
        cy.get('#channel_display_modeFormatA').click();
        cy.uiSave();
        cy.get('#channel_display_modeDesc').
            should('be.visible').
            and('contain', 'Full width');
        cy.uiClose();
        cy.get('#postListContent').should('be.visible');
        cy.findAllByTestId('postContent').
            first().
            should('have.class', 'post__content').
            and('not.have.class', 'center');
    });
    it('MM-T295 Channel display mode setting to "Fixed width, centered"', () => {
        cy.uiOpenSettingsModal('Display');
        cy.get('#displayButton').should('be.visible');
        cy.get('#displayButton').click();
        cy.get('#channel_display_modeEdit').click();
        cy.get('.section-max').scrollIntoView();
        cy.get('#channel_display_modeFormatB').click();
        cy.uiSave();
        cy.get('#channel_display_modeDesc').
            should('be.visible').
            and('contain', 'Fixed width');
        cy.uiClose();
        cy.get('#sidebarItem_town-square').click({force: true});
        cy.get('#postListContent').should('be.visible');
        cy.findAllByTestId('postContent').
            first().
            should('have.class', 'post__content center');
    });
});