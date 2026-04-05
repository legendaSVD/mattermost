describe('Notifications', () => {
    let user1;
    let user2;
    let team1;
    let team2;
    let testTeam1TownSquareUrl;
    let siteName;
    before(() => {
        cy.apiInitSetup().then(({team, user}) => {
            team1 = team;
            user1 = user;
            testTeam1TownSquareUrl = `/${team.name}/channels/town-square`;
            cy.apiCreateUser().then(({user: otherUser}) => {
                user2 = otherUser;
                cy.apiAddUserToTeam(team.id, user2.id);
            });
            cy.apiCreateTeam('team-b', 'Team B').then(({team: anotherTeam}) => {
                team2 = anotherTeam;
                cy.apiAddUserToTeam(team2.id, user1.id);
                cy.apiAddUserToTeam(team2.id, user2.id);
            });
            cy.apiGetConfig().then(({config}) => {
                siteName = config.TeamSettings.SiteName;
            });
            cy.apiLogin(user1);
            cy.visit(testTeam1TownSquareUrl);
            cy.findByText('CHANNELS').get('.unread-title').click();
            cy.findByText('CHANNELS').get('.unread-title').should('not.exist');
            cy.apiLogout();
        });
    });
    it('MM-T561 Browser tab and team sidebar - direct messages don\'t add indicator on team icon in team sidebar (but do in browser tab)', () => {
        cy.apiLogin(user1);
        cy.visit(testTeam1TownSquareUrl);
        cy.apiCreateDirectChannel([user1.id, user2.id]).then(({channel: ownDMChannel}) => {
            cy.postMessageAs({sender: user2, message: `@${user1.username}`, channelId: ownDMChannel.id});
        });
        cy.title().should('include', `(1) Town Square - ${team1.display_name} ${siteName}`);
        cy.get(`#${team2.name}TeamButton`).parent('.unread').should('not.exist');
        cy.get(`#${team2.name}TeamButton`).parent().within(() => {
            cy.get('.badge').should('not.exist');
        });
    });
});