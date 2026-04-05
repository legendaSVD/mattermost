import {createPrivateChannel} from '../elasticsearch_autocomplete/helpers';
import * as TIMEOUTS from '../../../../fixtures/timeouts';
describe('Guest Account - Guest User Experience', () => {
    let guestUser: Cypress.UserProfile;
    let privateChannel: Cypress.Channel;
    let testTeam: Cypress.Team;
    before(() => {
        cy.apiRequireLicenseForFeature('GuestAccounts');
        cy.apiUpdateConfig({
            GuestAccountsSettings: {
                Enable: true,
            },
            ServiceSettings: {
                EnableEmailInvitations: true,
            },
        });
        cy.apiInitSetup({userPrefix: 'guest'}).then(({user, team}) => {
            guestUser = user;
            testTeam = team;
        });
    });
    it('MM-T1369 System message when user is added specifies the guest status', () => {
        demoteGuestUser(guestUser);
        cy.apiCreateTeam('test-team2', 'Test Team2').then(({team: teamTwo}) => {
            cy.apiAddUserToTeam(teamTwo.id, guestUser.id).then(() => {
                cy.apiLogin(guestUser);
                cy.reload();
            });
        });
        createPrivateChannel(testTeam.id, guestUser).then((channel) => {
            privateChannel = channel;
            cy.visit(`/${testTeam.name}/channels/${privateChannel.name}`);
        });
        cy.getLastPostId().then((id) => {
            cy.get(`#postMessageText_${id}`).should('contain', `@${guestUser.username} added to the channel as a guest`);
        });
    });
    it('MM-T1397 Guest tag in search in:', () => {
        demoteGuestUser(guestUser);
        cy.apiAdminLogin();
        cy.visit(`/${testTeam.name}/channels/town-square`);
        cy.sendDirectMessageToUser(guestUser, 'hello');
        cy.uiGetSearchContainer().click();
        cy.uiGetSearchBox().wait(TIMEOUTS.FIVE_SEC).type(`in:${guestUser.username}`);
        cy.contains('.suggestion-list__item', guestUser.username).should('be.visible').within(($el) => {
            cy.wrap($el).find('.Tag').should('not.exist');
        });
    });
});
function demoteGuestUser(guestUser) {
    cy.apiAdminLogin();
    cy.apiGetUserByEmail(guestUser.email).then(({user}) => {
        if (user.roles !== 'system_guest') {
            cy.apiDemoteUserToGuest(guestUser.id);
        }
    });
}