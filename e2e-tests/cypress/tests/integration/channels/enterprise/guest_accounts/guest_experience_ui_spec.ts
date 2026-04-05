import * as TIMEOUTS from '../../../../fixtures/timeouts';
function demoteGuestUser(guestUser) {
    cy.apiAdminLogin();
    cy.apiGetUserByEmail(guestUser.email).then(({user}) => {
        if (user.roles !== 'system_guest') {
            cy.apiDemoteUserToGuest(guestUser.id);
        }
    });
}
describe('Guest Account - Guest User Experience', () => {
    let guestUser: Cypress.UserProfile;
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
        cy.apiInitSetup({userPrefix: 'guest'}).then(({user, team, channel}) => {
            guestUser = user;
            cy.apiDemoteUserToGuest(user.id).then(() => {
                cy.apiAddUserToTeam(team.id, guestUser.id).then(() => {
                    cy.apiAddUserToChannel(channel.id, guestUser.id).then(() => {
                        cy.apiLogin(guestUser);
                        cy.visit(`/${team.name}/channels/${channel.name}`);
                    });
                });
            });
        });
    });
    it('MM-T1354 Verify Guest User Restrictions', () => {
        cy.uiOpenTeamMenu();
        const missingMainOptions = [
            'Invite people',
            'Team settings',
            'Manage members',
            'Join another team',
            'Create a team',
        ];
        missingMainOptions.forEach((missingOption) => {
            cy.uiGetLHSTeamMenu().should('not.contain', missingOption);
        });
        const includeMainOptions = [
            'View members',
            'Leave team',
        ];
        includeMainOptions.forEach((includeOption) => {
            cy.uiGetLHSTeamMenu().findByText(includeOption);
        });
        cy.get('body').type('{esc}');
        cy.uiGetLHSAddChannelButton().should('not.exist');
        cy.get('#channelHeaderDescription').within(($el) => {
            cy.wrap($el).find('.has-guest-header').should('be.visible').and('have.text', 'Channel has guests');
        });
        cy.uiAddDirectMessage().click().wait(TIMEOUTS.FIVE_SEC);
        cy.get('#multiSelectList').should('be.visible').within(($el) => {
            cy.wrap($el).children().should('have.length', 2);
        });
        cy.uiClose();
        cy.postMessage('testing');
        cy.getLastPostId().then((postId) => {
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
        cy.uiGetLhsSection('CHANNELS').find('.SidebarChannel').should('have.length', 3);
        cy.uiOpenTeamMenu('View members');
        cy.get('#searchableUserListTotal').should('be.visible').and('have.text', '1 - 2 members of 2 total');
    });
    it('MM-18049 Verify Guest User Restrictions is removed when promoted', () => {
        cy.apiAdminLogin();
        cy.apiPromoteGuestToUser(guestUser.id);
        cy.apiLogin(guestUser);
        cy.reload();
        cy.uiOpenTeamMenu();
        const includeOptions = [
            'Invite people',
            'View members',
            'Leave team',
            'Create a team',
        ];
        includeOptions.forEach((option) => {
            cy.uiGetLHSTeamMenu().findByText(option);
        });
        cy.get('body').type('{esc}');
        cy.uiGetLHSTeamMenu().should('not.exist');
        cy.uiGetLHSAddChannelButton();
        cy.get('#sidebarItem_off-topic').click();
        cy.get('#channelIntro').should('be.visible');
        cy.get('#channelHeaderDescription').within(($el) => {
            cy.wrap($el).find('.has-guest-header').should('not.exist');
        });
        cy.get('#sidebarItem_off-topic').click({force: true});
        cy.postMessage('testing');
        cy.getLastPostId().then((postId) => {
            cy.get(`#post_${postId}`).within(($el) => {
                cy.wrap($el).find('.post__header .Tag').should('not.exist');
                cy.wrap($el).find('.post__header .user-popover').should('be.visible').click().wait(TIMEOUTS.HALF_SEC);
            });
        });
        cy.get('div.user-profile-popover').should('be.visible').within(($el) => {
            cy.wrap($el).find('.user-popover__role').should('not.exist');
        });
        cy.get('button.closeButtonRelativePosition').click();
        cy.get('#channel-header').click();
    });
    it('MM-T1417 Add Guest User to New Team from System Console', () => {
        demoteGuestUser(guestUser);
        cy.apiCreateTeam('test-team2', 'Test Team2').then(({team: teamTwo}) => {
            cy.apiAddUserToTeam(teamTwo.id, guestUser.id).then(() => {
                cy.apiLogin(guestUser);
                cy.reload();
                cy.get(`#${teamTwo.name}TeamButton`, {timeout: TIMEOUTS.ONE_MIN}).should('be.visible').click();
                cy.findByText('Channel Not Found').should('be.visible');
                cy.findByText('Your guest account has no channels assigned. Please contact an administrator.').should('be.visible');
                cy.findByText('Back').should('be.visible').click();
                cy.findByTestId('post_textbox').should('be.visible');
            });
        });
    });
    it('MM-T1412 Revoke Guest User Sessions when Guest feature is disabled', () => {
        demoteGuestUser(guestUser);
        cy.apiUpdateConfig({
            GuestAccountsSettings: {
                Enable: false,
            },
        });
        cy.uiGetPostTextBox().wait(TIMEOUTS.TWO_SEC);
        cy.apiLogout();
        cy.visit('/');
        cy.get('#input_loginId').type(guestUser.username);
        cy.get('#input_password-input').type('passwd');
        cy.get('#saveSetting').should('not.be.disabled').click();
        cy.findByText('Login failed because your account has been deactivated. Please contact an administrator.').should('be.visible');
    });
});