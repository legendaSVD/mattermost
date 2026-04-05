describe('Settings > Sidebar > Channel Switcher', () => {
    let testUser;
    let testTeam;
    before(() => {
        cy.apiInitSetup({loginAfter: true}).then(({team, user}) => {
            testUser = user;
            testTeam = team;
        });
    });
    beforeEach(() => {
        cy.visit(`/${testTeam.name}/channels/off-topic`);
        cy.get('#channelHeaderTitle').should('be.visible').should('contain', 'Off-Topic');
    });
    it('Cmd/Ctrl+Shift+L closes Channel Switch modal and sets focus to post textbox', () => {
        cy.uiGetPostTextBox().cmdOrCtrlShortcut('K');
        cy.get('#quickSwitchHint').should('be.visible').should('contain', 'Type to find a channel. Use UP/DOWN to browse, ENTER to select, ESC to dismiss.');
        cy.findByRole('combobox', {name: 'quick switch input'}).cmdOrCtrlShortcut('{shift}L');
        cy.get('#suggestionList').should('not.exist');
        cy.uiGetPostTextBox().should('be.focused');
    });
    it('Cmd/Ctrl+Shift+M closes Channel Switch modal and sets focus to mentions', () => {
        cy.apiPatchMe({notify_props: {first_name: 'false', mention_keys: testUser.username}});
        cy.uiGetPostTextBox().cmdOrCtrlShortcut('K');
        cy.get('#quickSwitchHint').should('be.visible').should('contain', 'Type to find a channel. Use UP/DOWN to browse, ENTER to select, ESC to dismiss.');
        cy.findByRole('combobox', {name: 'quick switch input'}).cmdOrCtrlShortcut('{shift}M');
        cy.get('#suggestionList').should('not.exist');
        cy.get('.sidebar--right__title').should('contain', 'Recent Mentions');
    });
});