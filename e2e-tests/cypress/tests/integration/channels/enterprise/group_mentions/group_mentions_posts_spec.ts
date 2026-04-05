import {UserProfile} from '@mattermost/types/users';
import {Team} from '@mattermost/types/teams';
import {Group} from '@mattermost/types/groups';
import ldapUsers from '../../../../fixtures/ldap_users.json';
import * as TIMEOUTS from '../../../../fixtures/timeouts';
import {enableGroupMention} from './helpers';
describe('Group Mentions', () => {
    let groupID1: string;
    let groupID2: string;
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
        cy.visit('/admin_console/user_management/groups');
        cy.get('#developers_group', {timeout: TIMEOUTS.ONE_MIN}).then((el) => {
            if (!el.text().includes('Edit')) {
                if (el.find('.icon.fa-unlink').length > 0) {
                    el.find('.icon.fa-unlink').click();
                }
            }
        });
        cy.apiGetGroups().then((res) => {
            res.body.forEach((group: Group) => {
                if (group.display_name === 'board') {
                    groupID1 = group.id;
                    cy.apiPatchGroup(group.id, {allow_reference: false});
                }
                if (group.display_name === 'developers') {
                    groupID2 = group.id;
                    cy.apiPatchGroup(group.id, {allow_reference: false});
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
    beforeEach(() => {
        cy.apiAdminLogin();
        cy.visit('/admin_console/user_management/groups');
        cy.get('#board_group', {timeout: TIMEOUTS.ONE_MIN}).then((el) => {
            if (!el.text().includes('Edit')) {
                if (el.find('.icon.fa-unlink').length > 0) {
                    el.find('.icon.fa-unlink').click();
                }
            }
        });
    });
    it('MM-T2447 - Group Mentions when group was unlinked', () => {
        const groupName = `board_test_case_${Date.now()}`;
        cy.apiAdminLogin();
        enableGroupMention(groupName, groupID1);
        cy.visit('/admin_console/user_management/groups');
        cy.get('#board_group', {timeout: TIMEOUTS.ONE_MIN}).then((el) => {
            el.find('.icon.fa-link').click();
        });
        cy.apiLogin(regularUser);
        cy.apiCreateChannel(testTeam.id, 'group-mention', 'Group Mentions').then(({channel}) => {
            cy.visit(`/${testTeam.name}/channels/${channel.name}`);
            cy.uiGetPostTextBox();
            cy.uiGetPostTextBox().clear().type(`@${groupName}`).wait(TIMEOUTS.TWO_SEC);
            cy.get('#suggestionList').should('not.exist');
            cy.postMessage(`@${groupName} `);
            cy.getLastPostId().then((postId) => {
                cy.get(`#postMessageText_${postId}`).should('include.text', `@${groupName}`);
                cy.get(`#postMessageText_${postId}`).find('.mention--highlight').should('not.exist');
            });
        });
    });
    it('MM-T2460 - Group Mentions when used in Direct Message', () => {
        const groupName = `board_test_case_${Date.now()}`;
        cy.apiAdminLogin();
        enableGroupMention(groupName, groupID1);
        cy.apiLogin(regularUser);
        cy.visit(`/${testTeam.name}/channels/town-square`);
        cy.uiGetPostTextBox();
        cy.uiAddDirectMessage().click();
        cy.get('.more-modal__row.clickable').first().click();
        cy.uiGetButton('Go').click();
        cy.uiGetPostTextBox().clear().type(`@${groupName}`).wait(TIMEOUTS.TWO_SEC);
        cy.get('#suggestionList').should('be.visible').children().within((el) => {
            cy.wrap(el).eq(0).should('contain', 'Group Mentions');
            cy.wrap(el).eq(1).should('contain', groupName);
        });
        cy.postMessage(`@${groupName} `);
        cy.getLastPostId().then((postId) => {
            cy.get(`#postMessageText_${postId}`).should('include.text', `@${groupName}`);
            cy.get(`#postMessageText_${postId}`).find('.mention--highlight').should('not.exist');
            cy.get(`#postMessageText_${postId}`).find('.group-mention-link').should('be.visible');
        });
    });
    it('MM-T2461 - Group Mentions when used in Group Message', () => {
        const groupName = `board_test_case_${Date.now()}`;
        cy.apiAdminLogin();
        enableGroupMention(groupName, groupID1);
        cy.apiLogin(regularUser);
        cy.visit(`/${testTeam.name}/channels/town-square`);
        cy.uiGetPostTextBox();
        cy.uiAddDirectMessage().click();
        cy.get('.more-modal__row.clickable').first().click();
        cy.uiGetButton('Go').click();
        cy.uiGetPostTextBox().clear().type(`@${groupName}`).wait(TIMEOUTS.TWO_SEC);
        cy.get('#suggestionList').should('be.visible').children().within((el) => {
            cy.wrap(el).eq(0).should('contain', 'Group Mentions');
            cy.wrap(el).eq(1).should('contain', groupName);
        });
        cy.postMessage(`@${groupName} `);
        cy.getLastPostId().then((postId) => {
            cy.get(`#postMessageText_${postId}`).should('include.text', `@${groupName}`);
            cy.get(`#postMessageText_${postId}`).find('.mention--highlight').should('not.exist');
            cy.get(`#postMessageText_${postId}`).find('.group-mention-link').should('be.visible');
        });
    });
    it('MM-T2443 - Group Mentions when Channel is Group Synced', () => {
        const groupName = `board_test_case_${Date.now()}`;
        const groupName2 = `developers_test_case_${Date.now()}`;
        cy.apiAdminLogin();
        enableGroupMention(groupName, groupID1);
        enableGroupMention(groupName2, groupID2);
        cy.apiCreateChannel(testTeam.id, 'group-mention-2', 'Group Mentions 2').then(({channel}) => {
            cy.apiLinkGroupChannel(groupID1, channel.id);
            cy.apiLogin({username: 'board.one', password: 'Password1'} as any).then(({user}: {user: UserProfile}) => {
                cy.apiAddUserToChannel(channel.id, user.id);
                cy.apiPatchChannel(channel.id, {group_constrained: true, type: 'P'});
                cy.apiLogin({username: 'dev.one', password: 'Password1'} as any).then(({user}: {user: UserProfile}) => {
                    cy.apiAdminLogin();
                    cy.apiAddUserToTeam(testTeam.id, user.id);
                    cy.apiLogin({username: 'board.one', password: 'Password1'} as any);
                    cy.visit(`/${testTeam.name}/channels/${channel.name}`);
                    cy.uiGetPostTextBox();
                    cy.postMessage(`@${groupName2} `);
                    cy.getLastPostId().then((postId) => {
                        cy.get(`#postMessageText_${postId}`).should('include.text', `@${groupName2}`);
                    });
                });
            });
        });
    });
});