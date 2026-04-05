describe('Keyboard Shortcuts', () => {
    let testTeam;
    let testUser;
    let otherUser;
    before(() => {
        cy.apiInitSetup().then(({team, user, offTopicUrl}) => {
            testTeam = team;
            testUser = user;
            cy.apiCreateUser({prefix: 'other'}).then(({user: user1}) => {
                otherUser = user1;
                cy.apiAddUserToTeam(testTeam.id, otherUser.id);
                cy.apiLogin(testUser);
                cy.visit(offTopicUrl);
            });
        });
    });
    it('MM-T1246 CTRL/CMD+K - @ at beginning of username', () => {
        cy.uiGetPostTextBox().cmdOrCtrlShortcut('k');
        cy.get('#quickSwitchInput').type('@' + otherUser.username.slice(0, 3));
        cy.findByTestId(otherUser.username).click();
        cy.url().should('include', `/${testTeam.name}/messages/@${otherUser.username}`);
    });
});