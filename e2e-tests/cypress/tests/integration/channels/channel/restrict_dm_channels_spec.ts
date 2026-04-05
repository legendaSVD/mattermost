describe('Restrict Direct Message Channels', () => {
    let testTeam;
    let testUser;
    let otherUser;
    before(() => {
        cy.apiUpdateConfig({
            TeamSettings: {
                RestrictDirectMessage: 'any',
            },
        });
        cy.apiInitSetup().then(({team, user}) => {
            testTeam = team;
            testUser = user;
            cy.apiCreateUser().then(({user}) => {
                otherUser = user;
                cy.apiLogin(testUser);
            });
        });
    });
    it('should allow direct messages between any users when RestrictDirectMessage is set to "any"', () => {
        cy.visit(`/${testTeam.name}/channels/town-square`);
        cy.findByLabelText('DIRECT MESSAGES').parents('.SidebarChannelGroup').within(() => {
            cy.get('.SidebarChannelGroupHeader_addButton').click();
        });
        cy.get('#moreDmModal').should('exist');
        cy.get('#selectItems input').should('be.enabled').typeWithForce(otherUser.username);
        cy.get('.more-modal__row').contains(otherUser.username).should('exist');
    });
    it('should restrict direct messages to team members when RestrictDirectMessage is set to "team"', () => {
        cy.apiAdminLogin().then(() => {
            cy.apiUpdateConfig({
                TeamSettings: {
                    RestrictDirectMessage: 'team',
                },
            }).then(() => {
                cy.apiLogin(testUser);
            });
        });
        cy.visit(`/${testTeam.name}/channels/town-square`);
        cy.findByLabelText('DIRECT MESSAGES').parents('.SidebarChannelGroup').within(() => {
            cy.get('.SidebarChannelGroupHeader_addButton').click();
        });
        cy.get('#moreDmModal').should('exist');
        cy.get('#selectItems input').should('be.enabled').typeWithForce(otherUser.username);
        cy.get('.more-modal__row').should('not.exist');
        cy.apiAdminLogin();
        cy.apiAddUserToTeam(testTeam.id, otherUser.id);
        cy.apiLogin(testUser);
        cy.visit(`/${testTeam.name}/channels/town-square`);
        cy.findByLabelText('DIRECT MESSAGES').parents('.SidebarChannelGroup').within(() => {
            cy.get('.SidebarChannelGroupHeader_addButton').click();
        });
        cy.get('#moreDmModal').should('exist');
        cy.get('#selectItems input').should('be.enabled').typeWithForce(otherUser.username);
        cy.get('.more-modal__row').contains(otherUser.username).should('exist');
    });
    it('should not allow direct messages to users that no longer share a team', () => {
        cy.apiAdminLogin();
        cy.apiUpdateConfig({
            TeamSettings: {
                RestrictDirectMessage: 'team',
            },
        });
        cy.apiAddUserToTeam(testTeam.id, otherUser.id);
        cy.apiLogin(testUser);
        cy.visit(`/${testTeam.name}/channels/town-square`);
        cy.apiCreateDirectChannel([otherUser.id, testUser.id]).then((channel) => {
            cy.visit(`/${testTeam.name}/messages/@${otherUser.username}`);
            cy.get('.channel-header').should('exist');
            cy.get('#post_textbox').should('be.enabled');
            cy.get('#post_textbox').type('Hello, this is a test message{enter}');
            cy.getLastPost().should('contain', 'Hello, this is a test message');
            cy.apiAdminLogin();
            cy.removeUserFromTeam(testTeam.id, otherUser.id);
            cy.apiLogin(testUser);
            cy.get(`#sidebarItem_${channel.channel.name}`).should('exist').click();
            cy.get('#post_textbox').should('not.exist');
            cy.get('#noSharedTeamMessage').should('exist');
        });
    });
});