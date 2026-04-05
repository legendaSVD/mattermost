import * as TIMEOUTS from '../../../../fixtures/timeouts';
describe('Guest Account - Guest User Badge and Popover', () => {
    let regularUser: Cypress.UserProfile;
    let guestUser: Cypress.UserProfile;
    let testTeam: Cypress.Team;
    let testChannel: Cypress.Channel;
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
        cy.apiInitSetup().then(({team, channel, user}) => {
            regularUser = user;
            testTeam = team;
            testChannel = channel;
            cy.apiCreateGuestUser({}).then(({guest}) => {
                guestUser = guest;
                cy.log(`Guest Id: ${guestUser.id}`);
                cy.log(`Guest Username ${guestUser.username}`);
                cy.apiAddUserToTeam(testTeam.id, guestUser.id).then(() => {
                    cy.apiAddUserToChannel(testChannel.id, guestUser.id);
                });
            });
            cy.apiLogin(regularUser);
            cy.visit(`/${team.name}/channels/${testChannel.name}`);
        });
    });
    it('MM-T1371 User profile popover shows guest badge', () => {
        cy.postMessageAs({sender: guestUser, message: 'Hello from yesterday', channelId: testChannel.id}).
            its('id').
            should('exist').
            as('yesterdaysPost');
        cy.get('@yesterdaysPost').then((postId) => {
            cy.get(`#post_${postId}`).within(($el) => {
                cy.wrap($el).find('.post__header .Tag').should('be.visible');
                cy.wrap($el).find('.post__header .user-popover').should('be.visible').click().wait(TIMEOUTS.HALF_SEC);
            });
        });
    });
});