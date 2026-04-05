describe('Multi Team and DM', () => {
    let testChannel;
    let testTeam;
    let testUser;
    let otherUser;
    before(() => {
        cy.apiInitSetup().then(({team, channel, user}) => {
            testTeam = team;
            testChannel = channel;
            testUser = user;
            cy.apiCreateUser().then(({user: user2}) => {
                otherUser = user2;
            });
            cy.apiLogin(testUser);
            cy.visit(`/${testTeam.name}/channels/${testChannel.name}`);
        });
    });
    it('MM-T439 Town Square is not marked as unread for existing users when a new user is added to the team', () => {
        cy.uiOpenSettingsModal('Advanced').within(() => {
            cy.findByRole('heading', {name: 'Enable Join/Leave Messages'}).click();
            cy.findByRole('radio', {name: 'Off'}).click();
            cy.uiSaveAndClose();
        });
        cy.findByLabelText('town square public channel').should('be.visible');
        cy.findByLabelText('off-topic public channel').click();
        cy.externalAddUserToTeam(otherUser.id, testTeam.id);
        cy.findByLabelText('town square public channel').should('be.visible');
        cy.findByText(testChannel.display_name).click();
        cy.findByLabelText('town square public channel').should('not.have.css', 'font-weight', '600');
    });
});