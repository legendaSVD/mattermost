describe('Notifications', () => {
    before(() => {
        cy.apiInitSetup().then(({team, user, channel}) => {
            cy.apiLogin(user);
            cy.visit(`/${team.name}/channels/${channel.name}`);
        });
    });
    it('MM-T5458 Notification sound modal selection should reset when settings canceled', () => {
        cy.uiOpenSettingsModal();
        cy.get('#desktopNotificationSoundEdit').should('be.visible').click();
        cy.get('#messageNotificationSoundSelect').click();
        cy.findByText('Down').click();
        cy.uiCancelButton().click();
        cy.get('#desktopNotificationSoundEdit').should('be.visible').click();
        cy.findByText('Bing').should('be.visible');
        cy.uiClose();
    });
});