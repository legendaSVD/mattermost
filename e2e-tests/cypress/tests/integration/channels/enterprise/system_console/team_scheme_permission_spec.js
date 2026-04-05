import {getAdminAccount} from '../../../../support/env';
describe('Team Scheme Channel Mentions Permissions Test', () => {
    let testUser;
    let testTeam;
    let testChannel;
    before(() => {
        cy.apiRequireLicense();
        cy.apiInitSetup().then(({team, channel, user}) => {
            testUser = user;
            testTeam = team;
            testChannel = channel;
        });
        deleteExistingTeamOverrideSchemes();
    });
    beforeEach(() => {
        cy.apiAdminLogin();
        cy.apiResetRoles();
    });
    it('MM-23018 - Create a team override scheme', () => {
        cy.visit('/admin_console/user_management/permissions/team_override_scheme');
        cy.get('#scheme-name').type('Test Team Scheme');
        cy.findByTestId('add-teams').click();
        cy.get('#selectItems input').typeWithForce(testTeam.display_name);
        cy.get('.team-info-block').then((el) => {
            el.click();
        });
        cy.get('#saveItems').click();
        cy.get('#saveSetting').click();
        cy.findByTestId('permissions-scheme-summary').within(() => {
            cy.get('.permissions-scheme-summary--header').should('include.text', 'Test Team Scheme');
            cy.get('.permissions-scheme-summary--teams').should('include.text', testTeam.display_name);
        });
    });
    it('MM-23018 - Enable and Disable Channel Mentions for team scheme', () => {
        checkChannelPermission(
            'use_channel_mentions',
            () => channelMentionsPermissionCheck(true),
            () => channelMentionsPermissionCheck(false),
            testUser,
            testTeam,
            testChannel,
        );
    });
    it('MM-24379 - Enable and Disable Create Post for team scheme -- KNOWN ISSUE:MM-42020', () => {
        checkChannelPermission(
            'create_post',
            () => createPostPermissionCheck(true),
            () => createPostPermissionCheck(false),
            testUser,
            testTeam,
            testChannel,
        );
    });
});
const setUserTeamAndChannelMemberships = (user, team, channel, channelAdmin = false, teamAdmin = false) => {
    const admin = getAdminAccount();
    cy.externalUpdateUserRoles(user.id, 'system_user');
    cy.externalRequest({user: admin, method: 'put', path: `teams/${team.id}/members/${user.id}/schemeRoles`, data: {scheme_user: true, scheme_admin: teamAdmin}});
    cy.externalRequest({user: admin, method: 'put', path: `channels/${channel.id}/members/${user.id}/schemeRoles`, data: {scheme_user: true, scheme_admin: channelAdmin}});
};
const saveConfig = () => {
    cy.get('#saveSetting').click();
    cy.url().should('equal', `${Cypress.config('baseUrl')}/admin_console/user_management/permissions`);
};
const enablePermission = (permissionCheckBoxTestId) => {
    cy.findByTestId(permissionCheckBoxTestId).then((el) => {
        if (!el.hasClass('checked')) {
            el.click();
        }
    });
};
const removePermission = (permissionCheckBoxTestId) => {
    cy.findByTestId(permissionCheckBoxTestId).then((el) => {
        if (el.hasClass('checked')) {
            el.click();
        }
    });
};
const deleteExistingTeamOverrideSchemes = () => {
    cy.apiGetSchemes('team').then(({schemes}) => {
        schemes.forEach((scheme) => {
            cy.apiDeleteScheme(scheme.id);
        });
    });
};
const channelMentionsPermissionCheck = (enabled) => {
    cy.postMessage('@here ');
    cy.getLastPostId().then((postId) => {
        if (enabled) {
            cy.get(`#postMessageText_${postId}`).should('not.include.text', 'Channel notifications are disabled');
        } else {
            cy.uiWaitUntilMessagePostedIncludes('Channel notifications are disabled');
            cy.get(`#postMessageText_${postId}`).should('include.text', 'Channel notifications are disabled');
        }
    });
};
const createPostPermissionCheck = (enabled) => {
    if (enabled) {
        cy.uiGetPostTextBox().should('not.be.disabled');
        cy.postMessage('test');
    } else {
        cy.uiGetPostTextBox().should('be.disabled');
    }
    cy.getLastPostId().then((postId) => {
        if (enabled) {
            cy.get(`#postMessageText_${postId}`).should('include.text', 'test');
        }
    });
};
const checkChannelPermission = (permissionName, hasChannelPermissionCheckFunc, notHasChannelPermissionCheckFunc, testUser, testTeam, testChannel) => {
    const channelUrl = `/${testTeam.name}/channels/${testChannel.name}`;
    setUserTeamAndChannelMemberships(testUser, testTeam, testChannel);
    cy.apiLogin(testUser);
    cy.visit(channelUrl);
    hasChannelPermissionCheckFunc();
    cy.apiAdminLogin();
    cy.apiGetSchemes('team').then(({schemes}) => {
        const teamScheme = schemes[0];
        const url = `admin_console/user_management/permissions/team_override_scheme/${teamScheme.id}`;
        const usersTestId = `all_users-posts-${permissionName}-checkbox`;
        const channelTestId = `${teamScheme.default_channel_admin_role}-posts-${permissionName}-checkbox`;
        const teamTestId = `${teamScheme.default_team_admin_role}-posts-${permissionName}-checkbox`;
        const testIds = [usersTestId, channelTestId, teamTestId];
        cy.visit(url);
        testIds.forEach((testId) => {
            cy.findByTestId(testId).should('have.class', 'checked');
        });
        removePermission(usersTestId);
        saveConfig();
        cy.visit(url);
        cy.findByTestId(usersTestId).should('not.have.class', 'checked');
        cy.findByTestId(channelTestId).should('have.class', 'checked');
        cy.findByTestId(teamTestId).should('have.class', 'checked');
        removePermission(channelTestId);
        saveConfig();
        cy.visit(url);
        cy.findByTestId(teamTestId).should('have.class', 'checked');
        cy.findByTestId(channelTestId).should('not.have.class', 'checked');
        cy.findByTestId(usersTestId).should('not.have.class', 'checked');
        enablePermission(channelTestId);
        saveConfig();
        cy.visit(url);
        cy.findByTestId(teamTestId).should('have.class', 'checked');
        cy.findByTestId(channelTestId).should('have.class', 'checked');
        cy.findByTestId(usersTestId).should('not.have.class', 'checked');
        setUserTeamAndChannelMemberships(testUser, testTeam, testChannel);
        cy.apiLogin(testUser);
        cy.visit(channelUrl);
        notHasChannelPermissionCheckFunc();
        setUserTeamAndChannelMemberships(testUser, testTeam, testChannel, true, false);
        cy.apiLogin(testUser);
        cy.visit(channelUrl);
        hasChannelPermissionCheckFunc();
        cy.apiAdminLogin();
        cy.visit(url);
        removePermission(channelTestId);
        saveConfig();
        cy.visit(url);
        cy.apiLogin(testUser);
        cy.visit(channelUrl);
        notHasChannelPermissionCheckFunc();
        setUserTeamAndChannelMemberships(testUser, testTeam, testChannel, true, true);
        cy.apiLogin(testUser);
        cy.visit(channelUrl);
        hasChannelPermissionCheckFunc();
        cy.apiAdminLogin();
        cy.visit(url);
        removePermission(teamTestId);
        saveConfig();
        cy.visit(url);
        cy.apiLogin(testUser);
        cy.visit(channelUrl);
        notHasChannelPermissionCheckFunc();
    });
};