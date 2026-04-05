describe('Messaging', () => {
    let testTeam;
    let firstUser;
    let secondUser;
    let thirdUser;
    before(() => {
        cy.apiInitSetup().then(({team, user: user1}) => {
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
        });
    });
    it('MM-T1226 - CTRL/CMD+K - Find GM by matching username, full name, or nickname, even if that name isn\'t displayed', () => {
        cy.apiCreateGroupChannel([firstUser.id, secondUser.id, thirdUser.id]).then(({channel}) => {
            cy.visit(`/${testTeam.name}/channels/${channel.name}`);
            cy.postMessage('hello');
            cy.get('#sidebarItem_off-topic').click();
            cy.uiGetPostTextBox().cmdOrCtrlShortcut('K');
            cy.focused().type(secondUser.last_name.slice(0, 7));
            cy.get('.suggestion--selected').should('exist').and('contain.text', secondUser.username).findByText('G').should('exist');
        });
    });
});