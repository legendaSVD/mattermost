import {getAdminAccount} from '../../../support/env';
function demoteUserToGuest(user, admin) {
    const baseUrl = Cypress.config('baseUrl');
    cy.externalRequest({user: admin, method: 'post', baseUrl, path: `users/${user.id}/demote`});
}
function promoteGuestToUser(user, admin) {
    const baseUrl = Cypress.config('baseUrl');
    cy.externalRequest({user: admin, method: 'post', baseUrl, path: `users/${user.id}/promote`});
}
describe('Channel header menu', () => {
    const admin = getAdminAccount();
    let testUser;
    let testTeam;
    before(() => {
        cy.apiInitSetup({loginAfter: true}).then(({team, user}) => {
            testUser = user;
            testTeam = team;
            cy.visit(`/${testTeam.name}/channels/town-square`);
        });
    });
    it('MM-14490 show/hide properly menu dividers', () => {
        cy.visit(`/${testTeam.name}/channels/town-square`);
        cy.apiCreateChannel(testTeam.id, 'channel-test', 'Channel Test').then(({channel}) => {
            cy.get(`#sidebarItem_${channel.name}`).click();
            cy.get('#channelHeaderTitle').should('contain', channel.display_name);
            cy.get('#channelHeaderTitle').click();
            cy.get('.Menu__content').should('be.visible');
            cy.get('.Menu__content').find('.menu-divider:visible').should('have.lengthOf', 3);
            demoteUserToGuest(testUser, admin);
            cy.reload();
            cy.get('#channelHeaderTitle').click();
            cy.get('.Menu__content').find('.menu-divider:visible').should('have.lengthOf', 2);
            promoteGuestToUser(testUser, admin);
            cy.reload();
            cy.get('#channelHeaderTitle').click();
            cy.get('.Menu__content').find('.menu-divider:visible').should('have.lengthOf', 3);
        });
    });
    it('MM-24590 should leave channel successfully', () => {
        cy.visit(`/${testTeam.name}/channels/town-square`);
        cy.apiAdminLogin();
        cy.apiCreateChannel(testTeam.id, 'channel-test-leave', 'Channel Test Leave').then(({channel}) => {
            cy.reload();
            cy.get(`#sidebarItem_${channel.name}`).click();
            cy.get('#channelHeaderTitle').should('contain', channel.display_name);
            cy.get('#channelHeaderTitle').click();
            cy.get('.Menu__content').should('be.visible');
            cy.get('#channelLeaveChannel').click();
            cy.get('#channelHeaderInfo').should('be.visible').and('contain', 'Town Square');
        });
    });
});