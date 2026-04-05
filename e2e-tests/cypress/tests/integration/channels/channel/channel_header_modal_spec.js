describe('Channel Settings - Channel Header', () => {
    let testTeam;
    before(() => {
        cy.apiInitSetup().then(({team, user}) => {
            testTeam = team;
            cy.apiLogin(user);
            cy.visit(`/${testTeam.name}/channels/town-square`);
        });
    });
    it('Create channel, modify header, and verify preview button functionality', () => {
        cy.apiCreateChannel(testTeam.id, 'new-channel', 'New Channel').then(({channel}) => {
            cy.visit(`/${testTeam.name}/channels/${channel.name}`);
            cy.get('#channelHeaderDropdownButton').click();
            cy.findByText('Channel Settings').click();
            cy.get('.ChannelSettingsModal').should('be.visible');
            cy.get('#genericModalLabel').should('contain', 'Channel Settings');
            cy.get('#channel_settings_header_textbox').clear().type('This is the new header content');
            cy.get('#channel_settings_header_textbox').
                parents('.AdvancedTextbox').
                find('#PreviewInputTextButton').
                should('not.have.class', 'active');
            cy.get('#channel_settings_header_textbox').should('have.css', 'display', 'block');
            cy.get('#channel_settings_header_textbox').
                parents('.AdvancedTextbox').
                find('#PreviewInputTextButton').click();
            cy.get('#channel_settings_header_textbox').should('have.css', 'display', 'none');
            cy.get('#channel_settings_header_textbox').
                parents('.AdvancedTextbox').
                find('#PreviewInputTextButton').
                should('have.class', 'active');
        });
    });
});