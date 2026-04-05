describe('Group Synced Team - Bot invitation flow', () => {
    let groupConstrainedTeam;
    let bot;
    before(() => {
        cy.apiRequireLicenseForFeature('LDAPGroups');
        cy.apiUpdateConfig({LdapSettings: {Enable: true}});
        cy.apiGetAllTeams().then(({teams}) => {
            teams.forEach((team) => {
                if (team.group_constrained && !groupConstrainedTeam) {
                    groupConstrainedTeam = team;
                }
            });
        });
        cy.apiGetBots().then(({bots}) => {
            bot = bots[0];
        });
    });
    it('MM-21793 Invite and remove a bot within a group synced team', () => {
        if (!groupConstrainedTeam || !bot) {
            return;
        }
        cy.apiLogout();
        const user = {
            username: 'test.one',
            password: 'Password1',
        } as Cypress.UserProfile;
        cy.apiLogin(user);
        cy.visit(`/${groupConstrainedTeam.name}`);
        cy.uiOpenTeamMenu('Invite people');
        cy.get('.users-emails-input__control input').typeWithForce(bot.username);
        cy.get('.users-emails-input__menu').
            children().should('have.length', 1).
            eq(0).should('contain', `@${bot.username}`).
            click();
        cy.findByTestId('inviteButton').click();
        cy.get('.InviteResultRow').find('.reason').should('not.contain', 'Error');
        cy.visit(`/${groupConstrainedTeam.name}`);
        cy.uiOpenTeamMenu('Manage members');
        cy.get('#searchUsersInput').should('be.visible').type(bot.username);
        cy.get(`#teamMembersDropdown_${bot.username}`).should('be.visible').then((el) => {
            el.click();
            cy.get('#removeFromTeam').should('be.visible').click();
        });
        cy.findByTestId('noUsersFound').should('be.visible');
    });
});