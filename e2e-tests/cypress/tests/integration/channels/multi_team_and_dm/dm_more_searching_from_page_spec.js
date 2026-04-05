describe('Multi Team and DM', () => {
    let testChannel;
    let testTeam;
    let testUser;
    let searchTerm;
    const prefix = 'testuser';
    before(() => {
        cy.apiInitSetup().then(({team, channel, user}) => {
            testTeam = team;
            testChannel = channel;
            testUser = user;
            searchTerm = user.username;
            Cypress._.times(52, () => {
                cy.apiCreateUser({prefix}).then(() => {
                    cy.apiAddUserToTeam(testTeam.id, user.id);
                });
            });
            cy.apiLogin(testUser);
            cy.visit(`/${testTeam.name}/channels/${testChannel.name}`);
        });
    });
    it('MM-T446 DM More... searching from page 2 of user list', () => {
        cy.uiAddDirectMessage().click();
        cy.findByText('Next').click();
        cy.findByText('Previous').should('exist');
        cy.findByRole('combobox', {name: 'Search for people'}).typeWithForce(searchTerm);
        cy.findByText('Next').should('not.exist');
        cy.findByText('Previous').should('not.exist');
        cy.findAllByText(prefix).should('not.exist');
        cy.findByText(`${searchTerm}@sample.mattermost.com`).should('be.visible');
    });
});