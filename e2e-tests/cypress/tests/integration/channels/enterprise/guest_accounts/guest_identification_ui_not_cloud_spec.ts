import * as TIMEOUTS from '../../../../fixtures/timeouts';
describe('Verify Guest User Identification in different screens', () => {
    let guestUser: Cypress.UserProfile;
    let testChannel: Cypress.Channel;
    before(() => {
        cy.shouldNotRunOnCloudEdition();
        cy.apiRequireLicenseForFeature('GuestAccounts');
        cy.apiUpdateConfig({
            GuestAccountsSettings: {
                Enable: true,
            },
            ServiceSettings: {
                EnableEmailInvitations: true,
            },
        });
        cy.apiInitSetup().then(({team, channel, user}) => {
            testChannel = channel;
            cy.apiCreateGuestUser({}).then(({guest}) => {
                guestUser = guest;
                cy.apiAddUserToTeam(team.id, guest.id).then(() => {
                    cy.apiAddUserToChannel(channel.id, guest.id);
                });
            });
            cy.apiLogin(user);
            cy.visit(`/${team.name}/channels/${channel.name}`);
        });
    });
    it('MM-T1419 Deactivating a Guest removes "Channel has guests" message from channel header', () => {
        cy.get('#channelHeaderDescription').within(($el) => {
            cy.wrap($el).find('.has-guest-header').should('be.visible').and('have.text', 'Channel has guests');
        });
        cy.externalActivateUser(guestUser.id, false);
        cy.wait(TIMEOUTS.FIVE_SEC);
        cy.get('.SidebarChannel:contains(Town Square)').click();
        cy.get(`.SidebarChannel:contains(${testChannel.display_name})`).click();
        cy.get('#channelHeaderDescription').within(($el) => {
            cy.wrap($el).find('.has-guest-header').should('not.exist');
        });
    });
});