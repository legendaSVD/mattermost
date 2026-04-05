import {getRandomId} from '../../../../../utils';
import {checkboxesTitleToIdMap} from './constants';
import {
    deleteOrEditTeamScheme,
    demoteToChannelOrTeamMember,
    disablePermission,
    enablePermission,
    enableDisableAllChannelModeratedPermissionsViaAPI,
    goToPermissionsAndCreateTeamOverrideScheme,
    goToSystemScheme,
    postChannelMentionsAndVerifySystemMessageNotExist,
    promoteToChannelOrTeamAdmin,
    saveConfigForChannel,
    saveConfigForScheme,
    viewManageChannelMembersRHS,
    visitChannel,
    visitChannelConfigPage,
} from './helpers';
describe('MM-23102 - Channel Moderation - Higher Scoped Scheme', () => {
    let regularUser;
    let guestUser;
    let testTeam;
    let testChannel;
    before(() => {
        cy.apiRequireLicense();
    });
    beforeEach(() => {
        cy.apiAdminLogin();
        cy.apiResetRoles();
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
        });
    });
    it('MM-T1559 Effect of changing System Schemes on a Channel for which Channel Moderation Settings was modified', () => {
        visitChannelConfigPage(testChannel);
        disablePermission(checkboxesTitleToIdMap.MANAGE_MEMBERS_MEMBERS);
        disablePermission(checkboxesTitleToIdMap.CHANNEL_MENTIONS_MEMBERS);
        enablePermission(checkboxesTitleToIdMap.MANAGE_MEMBERS_MEMBERS);
        saveConfigForChannel();
        goToSystemScheme();
        disablePermission(checkboxesTitleToIdMap.ALL_USERS_MANAGE_PUBLIC_CHANNEL_MEMBERS);
        saveConfigForScheme();
        visitChannelConfigPage(testChannel);
        cy.findByTestId(checkboxesTitleToIdMap.MANAGE_MEMBERS_MEMBERS).should('be.disabled');
        visitChannel(regularUser, testChannel, testTeam);
        viewManageChannelMembersRHS();
        cy.get('#showInviteModal').should('not.exist');
    });
    it('MM-T1560 Effect of changing System Schemes on a Channel for which Channel Moderation Settings was never modified', () => {
        cy.apiAdminLogin();
        cy.apiCreateChannel(testTeam.id, 'never-modified', `Never Modified ${getRandomId()}`).then(({channel}) => {
            goToSystemScheme();
            cy.findByTestId(checkboxesTitleToIdMap.ALL_USERS_MANAGE_PUBLIC_CHANNEL_MEMBERS).click();
            saveConfigForScheme();
            visitChannelConfigPage(channel);
            cy.findByTestId(checkboxesTitleToIdMap.MANAGE_MEMBERS_MEMBERS).should('be.disabled');
            visitChannel(regularUser, channel, testTeam);
            viewManageChannelMembersRHS();
            cy.get('#showInviteModal').should('not.exist');
        });
    });
    it('MM-T1561 Effect of changing Team Override Schemes on a Channel for which Channel Moderation Settings was never modified', () => {
        cy.apiAdminLogin();
        cy.apiCreateChannel(testTeam.id, 'never-modified', `Never Modified ${getRandomId()}`).then(({channel}) => {
            goToPermissionsAndCreateTeamOverrideScheme(channel.name, testTeam);
            deleteOrEditTeamScheme(channel.name, 'edit');
            cy.findByTestId(checkboxesTitleToIdMap.ALL_USERS_MANAGE_PUBLIC_CHANNEL_MEMBERS).click();
            saveConfigForScheme(false);
            visitChannelConfigPage(channel);
            cy.findByTestId('admin-channel_settings-channel_moderation-manageMembers-disabledMember').
                should('have.text', `Manage members for members are disabled in ${channel.name} Team Scheme.`);
            cy.findByTestId(checkboxesTitleToIdMap.MANAGE_MEMBERS_MEMBERS).should('be.disabled');
            visitChannel(regularUser, channel, testTeam);
            viewManageChannelMembersRHS();
            cy.get('#showInviteModal').should('not.exist');
        });
    });
    it('MM-T1562 Effect of changing Team Override Schemes on a Channel for which Channel Moderation Settings was modified', () => {
        const teamOverrideSchemeName = testChannel.name + getRandomId();
        visitChannelConfigPage(testChannel);
        disablePermission(checkboxesTitleToIdMap.MANAGE_MEMBERS_MEMBERS);
        disablePermission(checkboxesTitleToIdMap.CHANNEL_MENTIONS_MEMBERS);
        saveConfigForChannel();
        visitChannelConfigPage(testChannel);
        enablePermission(checkboxesTitleToIdMap.MANAGE_MEMBERS_MEMBERS);
        saveConfigForChannel();
        goToPermissionsAndCreateTeamOverrideScheme(teamOverrideSchemeName, testTeam);
        deleteOrEditTeamScheme(teamOverrideSchemeName, 'edit');
        cy.findByTestId(checkboxesTitleToIdMap.ALL_USERS_MANAGE_PUBLIC_CHANNEL_MEMBERS).click();
        saveConfigForScheme(false);
        visitChannelConfigPage(testChannel);
        cy.findByTestId('admin-channel_settings-channel_moderation-manageMembers-disabledMember').
            should('have.text', `Manage members for members are disabled in ${teamOverrideSchemeName} Team Scheme.`);
        cy.findByTestId(checkboxesTitleToIdMap.MANAGE_MEMBERS_MEMBERS).should('be.disabled');
        visitChannel(regularUser, testChannel, testTeam);
        viewManageChannelMembersRHS();
        cy.get('#showInviteModal').should('not.exist');
    });
    it('MM-T1578 Manage Members removed for Public Channels', () => {
        const teamOverrideSchemeName = testChannel.name + getRandomId();
        goToPermissionsAndCreateTeamOverrideScheme(teamOverrideSchemeName, testTeam);
        deleteOrEditTeamScheme(teamOverrideSchemeName, 'edit');
        cy.findByTestId(checkboxesTitleToIdMap.ALL_USERS_MANAGE_PUBLIC_CHANNEL_MEMBERS).click();
        cy.findByTestId(checkboxesTitleToIdMap.ALL_USERS_MANAGE_PRIVATE_CHANNEL_MEMBERS).should('be.visible').and('have.class', 'checked');
        saveConfigForScheme(false);
        visitChannelConfigPage(testChannel);
        cy.findByTestId('allow-all-toggle').should('has.have.text', 'Public');
        cy.findByTestId('admin-channel_settings-channel_moderation-manageMembers-disabledMember').
            should('have.text', `Manage members for members are disabled in ${teamOverrideSchemeName} Team Scheme.`);
        cy.findByTestId(checkboxesTitleToIdMap.MANAGE_MEMBERS_MEMBERS).should('be.disabled');
        cy.findByTestId('allow-all-toggle').click();
        saveConfigForChannel(testChannel.display_name, true);
        cy.findByTestId('allow-all-toggle').should('has.have.text', 'Private');
        cy.findByTestId('admin-channel_settings-channel_moderation-manageMembers-disabledMember').
            should('not.have.text', `Manage members for members are disabled in ${teamOverrideSchemeName} Team Scheme.`);
        cy.findByTestId(checkboxesTitleToIdMap.MANAGE_MEMBERS_MEMBERS).should('not.be.disabled');
        cy.findByTestId('allow-all-toggle').click();
        saveConfigForChannel(testChannel.display_name, true);
        cy.findByTestId('allow-all-toggle').should('has.have.text', 'Public');
    });
    it('MM-T1579 Manage Members removed for Private Channels / Permissions inherited when channel converted from Public to Private', () => {
        const teamOverrideSchemeName = testChannel.name + getRandomId();
        goToPermissionsAndCreateTeamOverrideScheme(teamOverrideSchemeName, testTeam);
        deleteOrEditTeamScheme(teamOverrideSchemeName, 'edit');
        cy.findByTestId(checkboxesTitleToIdMap.ALL_USERS_MANAGE_PRIVATE_CHANNEL_MEMBERS).click();
        cy.findByTestId(checkboxesTitleToIdMap.ALL_USERS_MANAGE_PUBLIC_CHANNEL_MEMBERS).should('be.visible').and('have.class', 'checked');
        saveConfigForScheme(false);
        visitChannelConfigPage(testChannel);
        cy.findByTestId('allow-all-toggle').should('has.have.text', 'Public');
        cy.findByTestId('admin-channel_settings-channel_moderation-manageMembers-disabledMember').
            should('not.have.text', `Manage members for members are disabled in ${teamOverrideSchemeName} Team Scheme.`);
        cy.findByTestId(checkboxesTitleToIdMap.MANAGE_MEMBERS_MEMBERS).should('not.be.disabled');
        cy.findByTestId('allow-all-toggle').click();
        saveConfigForChannel(testChannel.display_name, true);
        cy.findByTestId('allow-all-toggle').should('has.have.text', 'Private');
        cy.findByTestId('admin-channel_settings-channel_moderation-manageMembers-disabledMember').
            should('have.text', `Manage members for members are disabled in ${teamOverrideSchemeName} Team Scheme.`);
        cy.findByTestId(checkboxesTitleToIdMap.MANAGE_MEMBERS_MEMBERS).should('be.disabled');
        cy.findByTestId('allow-all-toggle').click();
        saveConfigForChannel(testChannel.display_name, true);
        cy.findByTestId('allow-all-toggle').should('has.have.text', 'Public');
    });
    it('MM-T1581 Check if user is allowed to Edit or Delete their own posts on a Read-Only channel', () => {
        visitChannel(regularUser, testChannel, testTeam);
        cy.postMessage(`test message ${Date.now()}`);
        cy.findByTestId('post_textbox_placeholder').should('not.have.text', 'This channel is read-only. Only members with permission can post here.');
        cy.findByTestId('post_textbox').should('not.be.disabled');
        visitChannelConfigPage(testChannel);
        disablePermission(checkboxesTitleToIdMap.CREATE_POSTS_MEMBERS);
        saveConfigForChannel();
        visitChannel(regularUser, testChannel, testTeam);
        cy.findByTestId('post_textbox_placeholder').should('have.text', 'This channel is read-only. Only members with permission can post here.');
        cy.findByTestId('post_textbox').should('be.disabled');
        cy.getLastPostId().then((postId) => {
            cy.clickPostDotMenu(postId);
            cy.get(`#edit_post_${postId}`).should('exist');
            cy.get(`#delete_post_${postId}`).should('exist');
        });
    });
    it('MM-T1582 Channel Moderation Settings should not be applied for Channel Admins', () => {
        enableDisableAllChannelModeratedPermissionsViaAPI(testChannel, false);
        visitChannel(regularUser, testChannel, testTeam);
        promoteToChannelOrTeamAdmin(regularUser.id, testChannel.id);
        postChannelMentionsAndVerifySystemMessageNotExist(testChannel);
        cy.getLastPostId().then((postId) => {
            cy.get(`#post_${postId}`).trigger('mouseover');
            cy.findByTestId('post-reaction-emoji-icon').should('exist');
        });
        viewManageChannelMembersRHS();
        cy.get('#showInviteModal').should('exist');
        demoteToChannelOrTeamMember(regularUser.id, testChannel.id);
    });
    it('MM-T1583 Channel Moderation Settings should not be applied for Team Admins', () => {
        enableDisableAllChannelModeratedPermissionsViaAPI(testChannel, false);
        visitChannel(regularUser, testChannel, testTeam);
        promoteToChannelOrTeamAdmin(regularUser.id, testTeam.id, 'teams');
        postChannelMentionsAndVerifySystemMessageNotExist(testChannel);
        cy.getLastPostId().then((postId) => {
            cy.get(`#post_${postId}`).trigger('mouseover');
            cy.findByTestId('post-reaction-emoji-icon').should('exist');
        });
        viewManageChannelMembersRHS();
        cy.get('#showInviteModal').should('exist');
        demoteToChannelOrTeamMember(regularUser.id, testTeam.id, 'teams');
    });
});