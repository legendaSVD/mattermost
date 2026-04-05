import * as TIMEOUTS from '../../../../fixtures/timeouts';
function removeUserFromAllChannels(verifyAlert, user) {
    const channels = ['Town Square', 'Off-Topic'];
    cy.get('#sidebarItem_town-square').click({force: true});
    channels.forEach((channel) => {
        cy.getCurrentChannelId().then((channelId) => {
            cy.removeUserFromChannel(channelId, user.id);
        });
        if (channel === 'Town Square' || verifyAlert) {
            cy.get('#removeFromChannelModalLabel').should('be.visible').and('have.text', `Removed from ${channel}`);
            cy.get('.modal-body').should('be.visible').contains(`removed you from ${channel}`);
            cy.get('#removedChannelBtn').should('be.visible').and('have.text', 'Okay').click().wait(TIMEOUTS.HALF_SEC);
        }
    });
}
describe('Guest Account - Guest User Removal Experience', () => {
    let team1: Cypress.Team;
    let team2: Cypress.Team;
    let guest: Cypress.UserProfile;
    before(() => {
        cy.apiRequireLicenseForFeature('GuestAccounts');
        cy.apiInitSetup().then(({team}) => {
            team1 = team;
            cy.apiCreateTeam('test-team2', 'Test Team2').then(({team}) => {
                team2 = team;
                cy.apiCreateUser().then(({user}) => {
                    guest = user;
                    cy.apiAddUserToTeam(team1.id, guest.id);
                    cy.apiAddUserToTeam(team2.id, guest.id).then(() => {
                        cy.apiLogin(guest);
                        cy.visit(`/${team2.name}/channels/town-square`);
                    });
                });
            });
        });
    });
    it('MM-T1360 Taken to login screen when removed from last channel', () => {
        cy.apiAdminLogin();
        cy.apiDemoteUserToGuest(guest.id);
        cy.apiLogin(guest);
        cy.reload();
        cy.get('#teamSidebarWrapper').should('be.visible');
        removeUserFromAllChannels(true, guest);
        cy.url().should('include', team1.name);
        cy.get('#teamSidebarWrapper').should('not.exist');
        removeUserFromAllChannels(false, guest);
        cy.url().should('include', '/select_team');
        cy.get('.signup__content').should('be.visible').and('have.text', 'Your guest account has no channels assigned. Please contact an administrator.');
        cy.apiAdminLogin();
        cy.reload().visit(`/${team2.name}/channels/town-square`);
        cy.getLastPost().
            should('contain', 'System').
            and('contain', `You and @${guest.username} joined the team.`).
            and('contain', `@${guest.username} was removed from the channel.`);
    });
});