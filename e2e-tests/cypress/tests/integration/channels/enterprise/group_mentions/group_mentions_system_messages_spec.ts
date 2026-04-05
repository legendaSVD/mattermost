import {Team} from '@mattermost/types/teams';
import {UserProfile} from '@mattermost/types/users';
import {Group} from '@mattermost/types/groups';
import ldapUsers from '../../../../fixtures/ldap_users.json';
import * as TIMEOUTS from '../../../../fixtures/timeouts';
import {
    disablePermission,
    enablePermission,
    saveConfigForChannel,
    visitChannelConfigPage,
} from '../system_console/channel_moderation/helpers';
import {checkboxesTitleToIdMap} from '../system_console/channel_moderation/constants';
import {enableGroupMention} from './helpers';
describe('Group Mentions', () => {
    let groupID: string;
    let boardUser;
    let regularUser: UserProfile;
    let testTeam: Team;
    before(() => {
        cy.apiRequireLicenseForFeature('LDAPGroups');
        cy.apiUpdateConfig({
            GuestAccountsSettings: {
                Enable: true,
            },
        });
        cy.apiInitSetup().then(({team, user}) => {
            regularUser = user;
            testTeam = team;
        });
        cy.apiLDAPTest();
        cy.apiLDAPSync();
        cy.visit('/admin_console/user_management/groups');
        cy.get('#board_group', {timeout: TIMEOUTS.ONE_MIN}).then((el) => {
            if (!el.text().includes('Edit')) {
                if (el.find('.icon.fa-unlink').length > 0) {
                    el.find('.icon.fa-unlink').click();
                }
            }
        });
        cy.apiGetGroups().then((res) => {
            res.body.forEach((group: Group) => {
                if (group.display_name === 'board') {
                    groupID = group.id;
                    cy.apiPatchGroup(groupID, {allow_reference: false});
                }
            });
        });
        boardUser = ldapUsers['board-1'];
        cy.apiLogin(boardUser);
        cy.apiAdminLogin();
        cy.apiGetUserByEmail(boardUser.email).then(({user}) => {
            cy.apiGetChannelByName(testTeam.name, 'town-square').then(({channel}) => {
                cy.apiAddUserToTeam(testTeam.id, user.id).then(() => {
                    cy.apiAddUserToChannel(channel.id, user.id);
                });
            });
            cy.apiSaveTutorialStep(user.id, '999');
        });
    });
    it('MM-T2456 - Group Mentions when group members are in the team but not in the channel', () => {
        const groupName = `board_test_case_${Date.now()}`;
        cy.apiAdminLogin();
        enableGroupMention(groupName, groupID, boardUser.email);
        cy.apiLogin(regularUser);
        cy.apiCreateChannel(testTeam.id, 'group-mention', 'Group Mentions').then(({channel}) => {
            cy.visit(`/${testTeam.name}/channels/${channel.name}`);
            cy.uiGetPostTextBox();
            cy.postMessage(`@${groupName} `);
            cy.getLastPostId().then((postId) => {
                cy.get(`#postMessageText_${postId}`).should('include.text', `@${boardUser.username} did not get notified by this mention because they are not in the channel. Would you like to add them to the channel? They will have access to all message history.`);
                cy.get('a.PostBody_addChannelMemberLink').should('be.visible');
            });
        });
    });
    it('MM-T2457 - Group Mentions when group members are not in the team and the channel', () => {
        const groupName = `board_test_case_${Date.now()}`;
        cy.apiAdminLogin();
        enableGroupMention(groupName, groupID, boardUser.email);
        cy.apiCreateTeam('team', 'Test NoMember').then(({team}) => {
            cy.apiCreateChannel(team.id, 'group-mention', 'Group Mentions').then(({channel}) => {
                cy.apiCreateUser().then(({user}) => {
                    cy.apiAddUserToTeam(team.id, user.id).then(() => {
                        cy.apiAddUserToChannel(channel.id, user.id);
                    });
                    cy.apiLogin(user);
                    cy.visit(`/${team.name}/channels/${channel.name}`);
                    cy.uiGetPostTextBox();
                    cy.postMessage(`@${groupName} `);
                    cy.getLastPostId().then((postId) => {
                        cy.get(`#postMessageText_${postId}`).
                            should('include.text', `@${groupName} has no members on this team`);
                        cy.get(`#postMessageText_${postId}`).find('.mention--highlight').should('not.exist');
                    });
                });
            });
        });
    });
    it('MM-T2458 - Group Mentions when group members are not in the channel as a Guest User', () => {
        const groupName = `board_test_case_${Date.now()}`;
        cy.apiAdminLogin();
        enableGroupMention(groupName, groupID, boardUser.email);
        cy.visit('/admin_console/user_management/permissions/system_scheme');
        cy.get('.admin-console__header', {timeout: TIMEOUTS.ONE_MIN}).should('be.visible').and('have.text', 'System Scheme');
        enablePermission('guests-guest_use_group_mentions-checkbox');
        cy.uiSaveConfig();
        cy.apiCreateChannel(testTeam.id, 'group-mention', 'Group Mentions').then(({channel}) => {
            cy.apiCreateUser().then(({user}) => {
                cy.apiAddUserToTeam(testTeam.id, user.id).then(() => {
                    cy.apiAddUserToChannel(channel.id, user.id);
                });
                cy.apiDemoteUserToGuest(user.id);
                cy.apiLogin(user);
                cy.visit(`/${testTeam.name}/channels/${channel.name}`);
                cy.uiGetPostTextBox();
                cy.postMessage(`@${groupName} `);
                cy.getLastPostId().then((postId) => {
                    cy.get(`#postMessageText_${postId}`).
                        should('include.text', `@${boardUser.username} did not get notified by this mention because they are not in the channel.`);
                    cy.get('a.PostBody_addChannelMemberLink').should('not.exist');
                });
            });
        });
    });
    it('MM-T2459 - Group Mentions when group members are not in the channel when Manage Members is disabled', () => {
        const groupName = `board_test_case_${Date.now()}`;
        cy.apiAdminLogin();
        enableGroupMention(groupName, groupID, boardUser.email);
        cy.apiCreateChannel(testTeam.id, 'group-mention', 'Group Mentions').then(({channel}) => {
            visitChannelConfigPage(channel);
            disablePermission(checkboxesTitleToIdMap.MANAGE_MEMBERS_MEMBERS);
            saveConfigForChannel();
            cy.apiAddUserToChannel(channel.id, regularUser.id);
            cy.apiLogin(regularUser);
            cy.visit(`/${testTeam.name}/channels/${channel.name}`);
            cy.uiGetPostTextBox();
            cy.postMessage(`@${groupName} `);
            cy.getLastPostId().then((postId) => {
                cy.get(`#postMessageText_${postId}`).
                    should('include.text', `@${boardUser.username} did not get notified by this mention because they are not in the channel.`);
                cy.get('a.PostBody_addChannelMemberLink').should('not.exist');
            });
        });
    });
});