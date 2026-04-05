describe('Join an open team from a direct message link', () => {
    let openTeam;
    let testUserInOpenTeam;
    let publicChannelInOpenTeam;
    let secondTestTeam;
    let testUserOutsideOpenTeam;
    before(() => {
        cy.apiCreateTeam('mmt452-second-team', 'mmt452-second-team', 'I', true).then(({team}) => {
            secondTestTeam = team;
            cy.apiCreateUser().then(({user}) => {
                testUserOutsideOpenTeam = user;
                cy.apiAddUserToTeam(secondTestTeam.id, testUserOutsideOpenTeam.id);
            });
        });
        cy.apiCreateTeam('mmt452-open-team', 'mmt452-open-team', 'O', true).then(({team}) => {
            openTeam = team;
            cy.apiPatchTeam(openTeam.id, {
                allow_open_invite: true,
            });
            cy.apiCreateChannel(openTeam.id, 'open-team-channel', 'open-team-channel').then(({channel}) => {
                publicChannelInOpenTeam = channel;
            });
            cy.apiCreateUser().then(({user}) => {
                testUserInOpenTeam = user;
                cy.apiAddUserToTeam(openTeam.id, testUserInOpenTeam.id);
                cy.apiLogin(testUserInOpenTeam);
            });
        });
    });
    it('MM-T452 User with no teams should be able to join an open team from a link in direct messages', () => {
        cy.visit(`/${openTeam.name}/channels/${publicChannelInOpenTeam.name}`);
        cy.get('#channelHeaderTitle').
            should('be.visible').
            and('contain.text', publicChannelInOpenTeam.display_name);
        cy.url().then((publicChannelUrl) => {
            sendDirectMessageToUser(testUserOutsideOpenTeam, openTeam, publicChannelUrl);
            cy.apiLogout();
            cy.apiLogin(testUserOutsideOpenTeam);
            cy.reload();
            cy.uiOpenUserMenu().findByText(`@${testUserOutsideOpenTeam.username}`);
            cy.visit(`/${secondTestTeam.name}/messages/@${testUserInOpenTeam.username}`);
            cy.get('#channelHeaderTitle').
                should('be.visible').
                and('contain.text', `${testUserInOpenTeam.username}`);
            cy.findByTestId('postContent').
                first().
                find('a.theme.markdown__link').
                should('have.attr', 'href', publicChannelUrl);
            cy.visit(publicChannelUrl);
            cy.url().should('equal', publicChannelUrl);
        });
        cy.uiGetLHSHeader().findByText(openTeam.display_name);
        cy.get('#channelHeaderTitle').
            should('be.visible').
            and('contain.text', publicChannelInOpenTeam.display_name);
    });
});
const sendDirectMessageToUser = (user, team, message) => {
    cy.visit(`/${team.name}/messages/@${user.username}`);
    cy.get('#channelHeaderTitle').should('be.visible').and('contain.text', user.username);
    cy.postMessage(message);
};