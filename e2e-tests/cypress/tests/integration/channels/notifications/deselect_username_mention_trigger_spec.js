import * as TIMEOUTS from '../../../fixtures/timeouts';
describe('Notifications', () => {
    let testTeam;
    let otherUser;
    before(() => {
        cy.apiInitSetup().then(({team}) => {
            testTeam = team;
            cy.apiCreateUser().then(({user}) => {
                otherUser = user;
                cy.apiAddUserToTeam(testTeam.id, otherUser.id);
                cy.apiLogin(otherUser);
            });
            cy.visit(`/${testTeam.name}`);
            cy.uiOpenSettingsModal().within(() => {
                cy.findByRole('heading', {name: 'Keywords that trigger notifications'}).should('be.visible').click();
                cy.findByRole('checkbox', {name: `Your non case-sensitive username "${otherUser.username}"`}).should('not.be.checked');
                cy.uiSaveAndClose();
            });
            cy.apiLogout();
            cy.apiAdminLogin();
            cy.visit(`/${testTeam.name}`);
        });
    });
    it('MM-T546 Words that trigger mentions - Deselect username, still get mention when added to private channel', () => {
        cy.apiCreateChannel(testTeam.id, 'private-channel', 'Private Channel', 'P').then(({channel}) => {
            cy.apiAddUserToChannel(channel.id, otherUser.id);
            cy.apiLogout();
            cy.apiLogin(otherUser);
            cy.visit(`/${testTeam.name}`);
            cy.get(`#sidebarItem_${channel.name}`, {timeout: TIMEOUTS.HALF_MIN}).should('be.visible').within(() => {
                cy.findByText(channel.display_name).should('be.visible');
                cy.get('#unreadMentions').should('have.text', 1);
            });
        });
    });
});