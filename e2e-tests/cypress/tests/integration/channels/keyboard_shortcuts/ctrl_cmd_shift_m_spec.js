describe('Keyboard Shortcuts', () => {
    let testTeam;
    let testChannel;
    let testUser;
    let otherUser;
    before(() => {
        cy.apiInitSetup().then(({team, channel, user}) => {
            testTeam = team;
            testChannel = channel;
            testUser = user;
            cy.apiCreateUser({prefix: 'other'}).then(({user: user1}) => {
                otherUser = user1;
                cy.apiAddUserToTeam(testTeam.id, otherUser.id).then(() => {
                    cy.apiAddUserToChannel(testChannel.id, otherUser.id);
                });
            });
        });
    });
    it('MM-T1253 - CTRL/CMD+SHIFT+M', () => {
        const message1 = ' from DM channel';
        const message2 = ' from channel';
        const message3 = ' using suggestion';
        const messagePrefix = `mention @${testUser.username}`;
        cy.apiLogin(testUser);
        cy.apiCreateDirectChannel([testUser.id, otherUser.id]).then(() => {
            cy.visit(`/${testTeam.name}/channels/${testUser.id}__${otherUser.id}`);
            cy.postMessage(messagePrefix + message1);
        });
        cy.visit(`/${testTeam.name}/channels/${testChannel.name}`);
        cy.postMessage(messagePrefix + message2);
        cy.uiGetPostTextBox().clear().type(messagePrefix + message3).type('{enter}{enter}');
        cy.postMessage('mention @here ');
        cy.postMessage('mention @all ');
        cy.postMessage('mention @channel ');
        cy.get('body').cmdOrCtrlShortcut('{shift}M');
        cy.get('.sidebar--right__title').should('contain', 'Recent Mentions');
        cy.findAllByTestId('search-item-container').should('be.visible').should('have.length', 3);
        cy.get('#search-items-container').within(() => {
            cy.findAllByText(`@${testUser.username}`).should('be.visible');
        });
    });
});