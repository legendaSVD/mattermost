describe('Keyboard Shortcuts', () => {
    let testUser;
    let testTeam;
    let publicChannel;
    before(() => {
        cy.apiInitSetup({loginAfter: true}).then(({team, channel, user}) => {
            testTeam = team;
            publicChannel = channel;
            testUser = user;
            cy.visit(`/${team.name}/channels/${channel.name}`);
        });
    });
    it('MM-T3421 - Pressing the backspace key without an input focused should not send the browser back in history', () => {
        cy.visit(`/${testTeam.name}/channels/town-square`);
        cy.visit(`/${testTeam.name}/channels/off-topic`);
        cy.visit(`/${testTeam.name}/channels/${publicChannel.name}`);
        cy.visit(`/${testTeam.name}/channels/off-topic`);
        cy.visit(`/${testTeam.name}/messages/@${testUser.username}`);
        cy.url().should('include', `/${testTeam.name}/messages/@${testUser.username}`);
        cy.uiGetPostTextBox().clear().type('This is a normal sentence.').type('{backspace}{backspace}').blur();
        cy.uiGetPostTextBox().should('have.value', 'This is a normal sentenc');
        cy.get('body').type('{backspace}');
        cy.get('body').type('{backspace}');
        cy.uiGetPostTextBox().should('have.value', 'This is a normal sentenc');
        cy.url().should('include', `/${testTeam.name}/messages/@${testUser.username}`);
    });
});