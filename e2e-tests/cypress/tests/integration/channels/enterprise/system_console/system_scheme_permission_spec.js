import {getAdminAccount} from '../../../../support/env';
describe('System Scheme Channel Mentions Permissions Test', () => {
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
    });
    beforeEach(() => {
        cy.apiAdminLogin();
        cy.apiResetRoles();
    });
    it('MM-23018 - Enable and Disable Channel Mentions', () => {
        checkChannelPermission(
            'use_channel_mentions',
            () => channelMentionsPermissionCheck(true),
            () => channelMentionsPermissionCheck(false),
            testUser,
            testTeam,
            testChannel,
        );
    });
    it('MM-24379 - Enable and Disable Create Post', () => {
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
    cy.waitUntil(() => cy.get('#saveSetting').then((el) => {
        return el[0].innerText === 'Save';
    }));
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
        cy.uiGetPostTextBox().and('not.be.disabled');
        cy.postMessage('test');
    } else {
        cy.uiGetPostTextBox().and('be.disabled');
    }
    cy.getLastPostId().then((postId) => {
        if (enabled) {
            cy.get(`#postMessageText_${postId}`).should('include.text', 'test');
        }
    });
};
const resetPermissionsToDefault = () => {
    cy.apiAdminLogin();
    cy.visit('/admin_console/user_management/permissions/system_scheme');
    cy.findByTestId('resetPermissionsToDefault').click();
    cy.get('#confirmModalButton').click();
    saveConfig();
};
const checkChannelPermission = (permissionName, hasChannelPermissionCheckFunc, notHasChannelPermissionCheckFunc, testUser, testTeam, testChannel) => {
    const guestsTestId = `guests-guest_${permissionName}-checkbox`;
    const usersTestId = `all_users-posts-${permissionName}-checkbox`;
    const channelTestId = `channel_admin-posts-${permissionName}-checkbox`;
    const teamTestId = `team_admin-posts-${permissionName}-checkbox`;
    const testIds = [guestsTestId, usersTestId, channelTestId, teamTestId];
    const channelUrl = `/${testTeam.name}/channels/${testChannel.name}`;
    setUserTeamAndChannelMemberships(testUser, testTeam, testChannel);
    cy.apiLogin(testUser);
    cy.visit(channelUrl);
    hasChannelPermissionCheckFunc();
    cy.apiAdminLogin();
    cy.visit('/admin_console/user_management/permissions/system_scheme');
    testIds.forEach((testId) => {
        cy.findByTestId(testId).should('have.class', 'checked');
    });
    removePermission(guestsTestId);
    saveConfig();
    cy.findByTestId(guestsTestId).should('not.have.class', 'checked');
    removePermission(usersTestId);
    saveConfig();
    cy.findByTestId(usersTestId).should('not.have.class', 'checked');
    cy.findByTestId(channelTestId).should('have.class', 'checked');
    cy.findByTestId(teamTestId).should('have.class', 'checked');
    removePermission(channelTestId);
    saveConfig();
    cy.findByTestId(teamTestId).should('have.class', 'checked');
    cy.findByTestId(channelTestId).should('not.have.class', 'checked');
    cy.findByTestId(usersTestId).should('not.have.class', 'checked');
    enablePermission(channelTestId);
    saveConfig();
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
    cy.visit('/admin_console/user_management/permissions/system_scheme');
    removePermission(channelTestId);
    saveConfig();
    cy.apiLogin(testUser);
    cy.visit(channelUrl);
    notHasChannelPermissionCheckFunc();
    setUserTeamAndChannelMemberships(testUser, testTeam, testChannel, true, true);
    cy.apiLogin(testUser);
    cy.visit(channelUrl);
    hasChannelPermissionCheckFunc();
    cy.apiAdminLogin();
    cy.visit('/admin_console/user_management/permissions/system_scheme');
    removePermission(teamTestId);
    saveConfig();
    cy.apiLogin(testUser);
    cy.visit(channelUrl);
    notHasChannelPermissionCheckFunc();
    resetPermissionsToDefault();
};