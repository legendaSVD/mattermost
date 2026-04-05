import dayjs from 'dayjs';
import * as TIMEOUTS from '../../../../fixtures/timeouts';
import {getAdminAccount} from '../../../../support/env';
describe('Verify Guest User Identification in different screens', () => {
    const admin = getAdminAccount();
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
                cy.apiAddUserToTeam(testTeam.id, guestUser.id).then(() => {
                    cy.apiAddUserToChannel(testChannel.id, guestUser.id);
                });
            });
            cy.apiLogin(regularUser);
            cy.visit(`/${team.name}/channels/${testChannel.name}`);
        });
    });
    it('MM-T1370 Verify Guest Badge in Channel Members dropdown and dialog', () => {
        cy.get('#channelHeaderTitle').click();
        cy.get('#channelMembers').click().wait(TIMEOUTS.HALF_SEC);
        cy.uiGetRHS().findByTestId(`memberline-${guestUser.id}`).within(($el) => {
            cy.wrap($el).get('.Tag').should('be.visible').should('have.text', 'GUEST');
        });
    });
    it('Verify Guest Badge in Team Members dialog', () => {
        cy.uiOpenTeamMenu('View members');
        cy.get('#teamMembersModal').should('be.visible').within(($el) => {
            cy.wrap($el).findAllByTestId('userListItemDetails').each(($elChild) => {
                cy.wrap($elChild).invoke('text').then((username) => {
                    if (username === guestUser.username) {
                        cy.wrap($elChild).find('.Tag').should('be.visible').and('have.text', 'GUEST');
                    }
                });
            });
            cy.wrap($el).find('.close').click();
        });
    });
    it('MM-T1372 Verify Guest Badge in Posts in Center Channel, RHS and User Profile Popovers', () => {
        cy.visit(`/${testTeam.name}/channels/${testChannel.name}`);
        const yesterdaysDate = dayjs().subtract(1, 'days').valueOf();
        cy.postMessageAs({sender: guestUser, message: 'Hello from yesterday', channelId: testChannel.id, createAt: yesterdaysDate}).
            its('id').
            should('exist').
            as('yesterdaysPost');
        cy.get('@yesterdaysPost').then((postId) => {
            cy.get(`#post_${postId}`).within(($el) => {
                cy.wrap($el).find('.post__header .Tag').should('be.visible');
                cy.wrap($el).find('.post__header .user-popover').should('be.visible').click().wait(TIMEOUTS.HALF_SEC);
            });
        });
        cy.get('div.user-profile-popover').should('be.visible').within(($el) => {
            cy.wrap($el).find('.GuestTag').should('be.visible').and('have.text', 'GUEST');
        });
        cy.get('button.closeButtonRelativePosition').click();
        cy.get('#channel-header').click();
        cy.get('@yesterdaysPost').then((postId) => {
            cy.clickPostCommentIcon(postId.toString());
            cy.get(`#rhsPost_${postId}`).within(($el) => {
                cy.wrap($el).find('.post__header .Tag').should('be.visible');
            });
            cy.uiCloseRHS();
        });
    });
    it('Verify Guest Badge in Switch Channel Dialog', () => {
        cy.uiOpenFindChannels();
        cy.findByRole('combobox', {name: 'quick switch input'}).type(guestUser.username).wait(TIMEOUTS.HALF_SEC);
        cy.get('#suggestionList').should('be.visible');
        cy.findByTestId(guestUser.username).within(($el) => {
            cy.wrap($el).find('.Tag').should('be.visible').and('have.text', 'GUEST');
        });
        cy.get('#quickSwitchModal').within(() => {
            cy.get('button.close[aria-label="Close"]').click();
        });
    });
    it('MM-T1377 Verify Guest Badge in DM Search dialog', () => {
        cy.uiAddDirectMessage().click().wait(TIMEOUTS.HALF_SEC);
        cy.focused().type(guestUser.username, {force: true}).wait(TIMEOUTS.HALF_SEC);
        cy.get('#multiSelectList').should('be.visible').within(($el) => {
            cy.wrap($el).find('.Tag').should('be.visible').and('have.text', 'GUEST');
        });
        cy.get('#moreDmModal .close').click();
    });
    it('Verify Guest Badge in DM header and GM header', () => {
        cy.uiAddDirectMessage().click();
        cy.findByRole('dialog', {name: 'Direct Messages'}).should('be.visible').wait(TIMEOUTS.ONE_SEC);
        cy.findByRole('combobox', {name: 'Search for people'}).
            should('have.focused').
            typeWithForce(guestUser.username).
            wait(TIMEOUTS.ONE_SEC).
            typeWithForce('{enter}');
        cy.uiGetButton('Go').click().wait(TIMEOUTS.HALF_SEC);
        cy.get('#channelHeaderTitle').should('be.visible').find('.Tag').should('be.visible').and('have.text', 'GUEST');
        cy.get('#channelHeaderDescription').within(($el) => {
            cy.wrap($el).find('.has-guest-header').should('be.visible').and('have.text', 'Channel has guests');
        });
        cy.uiAddDirectMessage().click();
        cy.findByRole('dialog', {name: 'Direct Messages'}).should('be.visible').wait(TIMEOUTS.ONE_SEC);
        cy.findByRole('combobox', {name: 'Search for people'}).
            should('have.focused').
            typeWithForce(guestUser.username).
            wait(TIMEOUTS.ONE_SEC).
            typeWithForce('{enter}');
        cy.findByRole('combobox', {name: 'Search for people'}).
            should('have.focused').
            typeWithForce(admin.username).
            wait(TIMEOUTS.ONE_SEC).
            typeWithForce('{enter}');
        cy.uiGetButton('Go').click().wait(TIMEOUTS.HALF_SEC);
        cy.get('#channelHeaderTitle').should('be.visible').find('.Tag').should('be.visible').and('have.text', 'GUEST');
        cy.get('#channelHeaderDescription').within(($el) => {
            cy.wrap($el).find('.has-guest-header').should('be.visible').and('have.text', 'This group message has guests');
        });
    });
    it('Verify Guest Badge in @mentions Autocomplete', () => {
        cy.uiGetPostTextBox().type(`@${guestUser.username}`);
        cy.get('#suggestionList').should('be.visible');
        cy.findByTestId(`mentionSuggestion_${guestUser.username}`).within(($el) => {
            cy.wrap($el).find('.Tag').should('be.visible').and('have.text', 'GUEST');
        });
    });
    it('Verify Guest Badge not displayed in Search Autocomplete', () => {
        cy.uiGetSearchContainer().click();
        cy.uiGetSearchBox().type('from:');
        cy.contains('.suggestion-list__item', guestUser.username).scrollIntoView().should('be.visible').within(($el) => {
            cy.wrap($el).find('.Tag').should('not.exist');
        });
        cy.findByTestId('searchBoxClose').click({force: true});
    });
});