import * as TIMEOUTS from '../../../../fixtures/timeouts';
const deleteExistingTeamOverrideSchemes = () => {
    cy.apiGetSchemes('team').then(({schemes}) => {
        schemes.forEach((scheme) => {
            cy.apiDeleteScheme(scheme.id);
        });
    });
};
const createTeamOverrideSchemeWithPermission = (name, team, permissionId, permissionValue) => {
    cy.apiAdminLogin();
    cy.visit('/admin_console/user_management/permissions');
    cy.findByTestId('team-override-schemes-link').should('be.visible').click().wait(TIMEOUTS.HALF_SEC);
    cy.get('#scheme-name').should('be.visible').type(name);
    cy.get('#scheme-description').type('Description');
    cy.findByTestId('add-teams').should('be.visible').click().wait(TIMEOUTS.HALF_SEC);
    cy.get('#selectItems input').typeWithForce(team.display_name).wait(TIMEOUTS.HALF_SEC);
    cy.get('#multiSelectList div.more-modal__row.clickable').eq(0).click().wait(TIMEOUTS.HALF_SEC);
    cy.get('#saveItems').should('be.visible').click().wait(TIMEOUTS.HALF_SEC);
    cy.findByTestId(permissionId).then((el) => {
        if ((!el.hasClass('checked') && permissionValue) || (el.hasClass('checked') && !permissionValue)) {
            el.click();
        }
    });
    cy.get('#saveSetting').click().wait(TIMEOUTS.TWO_SEC);
    cy.apiLogout();
};
describe('Team Permissions', () => {
    let testTeam;
    let testUser;
    let testPrivateCh;
    let otherUser;
    const schemeName = 'schemetest';
    before(() => {
        cy.apiRequireLicense();
        cy.apiInitSetup().then(({team, user}) => {
            testTeam = team;
            testUser = user;
            cy.apiCreateChannel(testTeam.id, 'private-permissions-test', 'Private Permissions Test', 'P', '').then(({channel}) => {
                cy.apiAddUserToChannel(channel.id, testUser.id);
                testPrivateCh = channel;
            });
            cy.apiCreateUser().then(({user: newUser}) => {
                otherUser = newUser;
                cy.apiAddUserToTeam(testTeam.id, otherUser.id);
            });
        });
    });
    beforeEach(() => {
        cy.apiLogout();
        cy.apiAdminLogin();
        cy.apiResetRoles();
        deleteExistingTeamOverrideSchemes();
    });
    it('MM-T2871 Member cannot add members to the team', () => {
        createTeamOverrideSchemeWithPermission(schemeName, testTeam, 'all_users-teams_team_scope-send_invites-checkbox', false);
        cy.apiLogin(testUser);
        cy.visit(`/${testTeam.name}/channels/town-square`);
        cy.uiOpenTeamMenu().wait(TIMEOUTS.HALF_SEC);
        cy.get("#sidebarTeamMenu li:contains('Invite people')").should('not.exist');
        cy.get("#sidebarTeamMenu li:contains('View members')").should('be.visible').click().wait(TIMEOUTS.HALF_SEC);
        cy.get('#teamMembersModal').should('be.visible');
        cy.get('#invitePeople').should('not.exist');
    });
    it('MM-T2876 Member cannot add or remove other members from private channel', () => {
        createTeamOverrideSchemeWithPermission(schemeName, testTeam, 'all_users-private_channel-manage_private_channel_members_and_read_groups-checkbox', false);
        cy.apiLogin(testUser);
        cy.visit(`/${testTeam.name}/channels/${testPrivateCh.name}`);
        cy.uiOpenChannelMenu().wait(TIMEOUTS.HALF_SEC);
        cy.get('#channelHeaderDropdownMenu').should('be.visible');
        cy.get('#channelMembers').should('be.visible');
        cy.get('body').type('{esc}');
        cy.get('.member-rhs__trigger').should('be.visible').click().wait(TIMEOUTS.HALF_SEC);
        cy.uiGetRHS().contains('button', 'Manage').should('not.exist');
        cy.uiGetRHS().contains('button', 'Add').should('not.exist');
    });
    it('MM-T2878 Member cannot create a private channel', () => {
        createTeamOverrideSchemeWithPermission(schemeName, testTeam, 'all_users-private_channel-create_private_channel-checkbox', false);
        cy.apiLogin(testUser);
        cy.visit(`/${testTeam.name}/channels/town-square`);
        cy.uiBrowseOrCreateChannel('Create new channel');
        cy.findByRole('dialog', {name: 'Create a new channel'}).find('#public-private-selector-button-P').should('have.class', 'disabled');
    });
    it('MM-T2900 As a Channel Admin, the test user is now able to add or remove other users from public channel', () => {
        cy.apiLogin(testUser);
        cy.apiCreateChannel(testTeam.id, 'public-permissions-test', 'Public Permissions Test', 'O', '').then(({channel}) => {
            cy.visit(`/${testTeam.name}/channels/${channel.name}`);
            cy.uiOpenChannelMenu().wait(TIMEOUTS.HALF_SEC);
            cy.get('#channelHeaderDropdownMenu').should('be.visible');
            cy.get('#channelMembers').should('be.visible').click().wait(TIMEOUTS.HALF_SEC);
            cy.uiGetButton('Add').click();
            cy.get('#selectItems input').typeWithForce(otherUser.username).wait(TIMEOUTS.HALF_SEC);
            cy.get('#multiSelectList div').eq(0).click();
            cy.get('#saveItems').should('be.visible').click().wait(TIMEOUTS.ONE_SEC);
            cy.uiOpenChannelMenu().wait(TIMEOUTS.HALF_SEC);
            cy.get('#channelHeaderDropdownMenu').should('be.visible');
            cy.get('#channelMembers').should('be.visible').click().wait(TIMEOUTS.HALF_SEC);
            cy.uiGetButton('Manage').click();
            cy.uiGetRHS().findByTestId(`memberline-${otherUser.id}`).within(() => {
                cy.findByTestId('rolechooser').should('be.visible').and('contain.text', 'Member').click().wait(TIMEOUTS.HALF_SEC);
                cy.findByTestId('rolechooser').within(() => {
                    cy.get('.Menu__content.dropdown-menu .MenuItem').eq(1).should('be.visible').and('contain.text', 'Remove from Channel').click();
                });
            });
        });
    });
    it('MM-T2908 As a Team Admin, the test user is able to update the public channel Name, Header and Purpose', () => {
        cy.apiLogin(testUser);
        cy.apiCreateTeam('test-team-permissions', 'Test Team Permissions').then(({team}) => {
            cy.visit(`/${team.name}/channels/off-topic`);
            cy.get('#channelHeaderDropdownButton').click();
            cy.findByText('Channel Settings').should('be.visible');
            cy.findByText('Channel Settings').click();
            cy.get('.ChannelSettingsModal').should('be.visible');
            cy.get('#input_channel-settings-name').should('be.visible').and('not.be.disabled');
            cy.get('.url-input-button').should('be.visible').and('not.be.disabled');
            cy.get('#channel_settings_purpose_textbox').should('be.visible').and('not.be.disabled');
            cy.get('#channel_settings_header_textbox').should('be.visible').and('not.be.disabled');
            cy.get('.GenericModal .modal-header button[aria-label="Close"]').click();
            cy.get('.ChannelSettingsModal').should('not.exist');
        });
    });
});