describe('Keyboard Shortcuts', () => {
    let testTeam;
    let firstUser;
    let secondUser;
    let thirdUser;
    before(() => {
        cy.apiInitSetup().then(({offTopicUrl, team, user: user1}) => {
            firstUser = user1;
            testTeam = team;
            cy.apiCreateUser().then(({user: user2}) => {
                secondUser = user2;
                cy.apiAddUserToTeam(testTeam.id, secondUser.id);
            });
            cy.apiCreateUser().then(({user: user3}) => {
                thirdUser = user3;
                cy.apiAddUserToTeam(testTeam.id, thirdUser.id);
            });
            cy.apiLogin(firstUser);
            cy.visit(offTopicUrl);
        });
    });
    it('MM-T1245 CTRL/CMD+K - Open GM using mouse', () => {
        cy.apiCreateGroupChannel([firstUser.id, secondUser.id, thirdUser.id]).then(() => {
            cy.uiGetPostTextBox().cmdOrCtrlShortcut('K');
            cy.waitUntil(() => cy.findByRole('listbox', {name: 'Suggestions'}).should('be.visible'));
            cy.get('.status--group').click();
            cy.get('.channel-intro__text').contains('This is the start of your group message history with these teammates').
                should('be.visible');
            cy.get('.channel-intro__title').contains(secondUser.username).contains(thirdUser.username);
        });
    });
});