describe('Notifications', () => {
    let testTeam;
    let otherUser;
    before(() => {
        cy.apiInitSetup({loginAfter: true}).then(({team, user}) => {
            testTeam = team;
            otherUser = user;
            cy.visit(`/${testTeam.name}`);
            cy.uiOpenSettingsModal().within(() => {
                cy.findByRole('heading', {name: 'Keywords that trigger notifications'}).should('be.visible').click();
                cy.findByRole('checkbox', {name: `Your case-sensitive first name "${otherUser.first_name}"`}).should('not.be.checked');
                cy.findByRole('checkbox', {name: `Your non case-sensitive username "${otherUser.username}"`}).should('not.be.checked');
                cy.findByRole('checkbox', {name: 'Channel-wide mentions "@channel", "@all", "@here"'}).click().should('not.be.checked');
                cy.findByRole('checkbox', {name: 'Other non case-sensitive words, press Tab or use commas to separate keywords:'}).should('not.be.checked');
                cy.uiSaveAndClose();
            });
            cy.apiLogout();
            cy.apiAdminLogin();
            cy.visit(`/${testTeam.name}`);
        });
    });
    it('MM-T550 Words that trigger mentions - @-icon still shows mentions list if all triggers deselected', () => {
        const text = `${otherUser.username} test message!`;
        cy.focused().type('@');
        cy.get('#suggestionList').should('be.visible').within(() => {
            cy.findByText(`@${otherUser.username}`).should('be.visible');
        });
        cy.focused().type(`${text}{enter}{enter}`);
        cy.apiLogout();
        cy.apiLogin(otherUser);
        cy.visit(`/${testTeam.name}`);
        cy.uiGetRecentMentionButton().click();
        cy.get('#search-items-container').should('be.visible').within(() => {
            cy.findByText(`@${otherUser.username}`).should('be.visible');
            cy.findByText('test message!').should('be.visible');
        });
    });
});