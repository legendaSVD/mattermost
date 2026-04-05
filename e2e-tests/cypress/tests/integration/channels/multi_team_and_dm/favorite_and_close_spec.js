describe('Close group messages', () => {
    let testUser;
    let otherUser1;
    let otherUser2;
    let testTeam;
    before(() => {
        cy.apiAdminLogin();
        cy.apiInitSetup().then(({team, user}) => {
            testUser = user;
            testTeam = team;
            cy.apiCreateUser({prefix: 'aaa'}).then(({user: newUser}) => {
                otherUser1 = newUser;
                cy.apiAddUserToTeam(team.id, newUser.id);
            });
            cy.apiCreateUser({prefix: 'bbb'}).then(({user: newUser}) => {
                otherUser2 = newUser;
                cy.apiAddUserToTeam(team.id, newUser.id);
            });
            cy.apiLogin(testUser);
            cy.visit(`/${team.name}/channels/town-square`);
        });
    });
    it('MM-T474 - GM: Favorite, and close', () => {
        createAndVisitGMChannel([otherUser1, otherUser2]).then((channel) => {
            cy.get('#toggleFavorite').click();
            cy.uiGetLhsSection('FAVORITES').find('.SidebarChannel').first().should('contain', channel.display_name.replace(`, ${testUser.username}`, ''));
            cy.uiGetChannelSidebarMenu(channel.name, true).within(() => {
                cy.findByText('Close Conversation').click();
            });
            verifyChannelWasProperlyClosed(channel.name);
        });
    });
    function createAndVisitGMChannel(users = []) {
        const userIds = users.map((user) => user.id);
        return cy.apiCreateGroupChannel(userIds).then(({channel}) => {
            cy.visit(`/${testTeam.name}/channels/${channel.name}`);
            const displayName = users.
                map((member) => member.username).
                sort((a, b) => a.localeCompare(b, 'en', {numeric: true})).
                join(', ');
            cy.get('#channelHeaderTitle').should('contain', displayName);
            return cy.wrap(channel);
        });
    }
    function verifyChannelWasProperlyClosed(channelName) {
        cy.get('#channelHeaderTitle').should('contain', 'Town Square');
        cy.get('#sidebarItem_' + channelName).should('not.exist');
    }
});