import * as TIMEOUTS from '../../../../fixtures/timeouts';
import users from '../../../../fixtures/ldap_users.json';
let groupID;
let boardUser;
let regularUser;
let testTeam;
const navigateToGroup = (id) => {
    cy.apiAdminLogin();
    cy.visit(`/admin_console/user_management/groups/${id}`);
    cy.get('#group_users').scrollIntoView();
    cy.findByText(boardUser.email).should('be.visible');
    cy.get('#group_profile').scrollIntoView();
};
const assertGroupMentionDisabled = (groupName) => {
    const suggestion = groupName.substring(0, groupName.length - 1);
    cy.visit(`/${testTeam.name}/channels/off-topic`);
    cy.uiGetPostTextBox().clear().type(`@${suggestion}`).wait(TIMEOUTS.HALF_SEC);
    cy.get('#suggestionList').should('not.exist');
    cy.uiGetPostTextBox().clear().type(`@${groupName}{enter}{enter}`);
    cy.getLastPostId().then((postId) => {
        cy.get(`#postMessageText_${postId}`).find('.group-mention-link').should('not.exist');
        cy.get(`#postMessageText_${postId}`).should('include.text', `@${groupName}`);
    });
    cy.apiLogin(boardUser);
    cy.visit(`/${testTeam.name}/channels/off-topic`);
    cy.getLastPostId().then((postId) => {
        cy.get(`#postMessageText_${postId}`).find('.mention--highlight').should('not.exist');
        cy.get(`#postMessageText_${postId}`).should('include.text', `@${groupName}`);
    });
};
const assertGroupMentionEnabled = (groupName) => {
    const suggestion = groupName.substring(0, groupName.length - 1);
    cy.visit(`/${testTeam.name}/channels/off-topic`);
    cy.uiGetPostTextBox().clear().type(`@${suggestion}`).wait(TIMEOUTS.HALF_SEC);
    cy.get('#suggestionList', {timeout: TIMEOUTS.FIVE_SEC}).should('be.visible').children().within((el) => {
        cy.wrap(el).eq(0).should('contain', 'Group Mentions');
        cy.wrap(el).eq(1).should('contain', `@${groupName}`);
    });
    cy.uiGetPostTextBox().clear().type(`@${groupName}{enter}{enter}`).wait(TIMEOUTS.HALF_SEC);
    cy.getLastPostId().then((postId) => {
        cy.get(`#postMessageText_${postId}`).find('.group-mention-link').should('be.visible').should('include.text', `@${groupName}`);
    });
    cy.apiLogin(boardUser);
    cy.visit(`/${testTeam.name}/channels/off-topic`);
    cy.getLastPostId().then((postId) => {
        cy.get(`#postMessageText_${postId}`).find('.mention--highlight').should('be.visible').should('include.text', `@${groupName}`);
    });
};
const saveConfig = () => {
    cy.get('#saveSetting').then((btn) => {
        if (btn.is(':enabled')) {
            btn.click();
            cy.waitUntil(() => cy.get('#saveSetting').then((el) => {
                return el[0].innerText === 'Save';
            }));
        }
    });
};
describe('System Console', () => {
    before(() => {
        cy.apiRequireLicenseForFeature('LDAPGroups');
        cy.apiUpdateConfig({LdapSettings: {Enable: true}});
        cy.apiInitSetup().then(({team, user}) => {
            regularUser = user;
            testTeam = team;
        });
        cy.visit('/admin_console/user_management/groups');
        cy.get('#board_group').then((el) => {
            if (!el.text().includes('Edit')) {
                if (el.find('.icon.fa-unlink').length > 0) {
                    el.find('.icon.fa-unlink').click();
                }
            }
        });
        cy.apiGetGroups().then((res) => {
            res.body.forEach((group) => {
                if (group.display_name === 'board') {
                    groupID = group.id;
                    cy.apiPatchGroup(groupID, {allow_reference: false});
                }
            });
        });
        boardUser = users['board-1'];
        cy.apiLogin(boardUser);
        cy.apiAdminLogin();
        cy.apiGetUserByEmail(boardUser.email).then(({user}) => {
            cy.apiGetChannelByName(testTeam.name, 'off-topic').then(({channel}) => {
                cy.apiAddUserToTeam(testTeam.id, user.id).then(() => {
                    cy.apiAddUserToChannel(channel.id, user.id);
                });
            });
            cy.apiSaveTutorialStep(user.id, '999');
        });
    });
    it('MM-23937 - Can enable and disable group mentions with a custom name for a group ', () => {
        const groupName = `board_test_case_${Date.now()}`;
        navigateToGroup(groupID);
        cy.findByTestId('allowReferenceSwitch').then((el) => {
            el.find('button').click();
            cy.get('#groupMention').find('input').clear().type(groupName);
            saveConfig();
            assertGroupMentionEnabled(groupName);
            navigateToGroup(groupID);
            cy.findByTestId('allowReferenceSwitch').then((elSwitch) => {
                elSwitch.find('button').click();
                saveConfig();
                assertGroupMentionDisabled(groupName);
            });
        });
    });
    it('MM-23937 - Can restrict users from mentioning a group through the use_group_mentions permission', () => {
        const groupName = `board_test_case_${Date.now()}`;
        cy.apiAdminLogin();
        cy.apiPatchGroup(groupID, {allow_reference: true, name: groupName});
        cy.visit('/admin_console/user_management/permissions/system_scheme');
        cy.findByTestId('resetPermissionsToDefault').click({force: true});
        cy.get('#confirmModalButton').click({force: true});
        saveConfig();
        cy.apiLogin(regularUser);
        assertGroupMentionEnabled(groupName);
        cy.apiAdminLogin();
        cy.visit('/admin_console/user_management/permissions/system_scheme');
        cy.findByTestId('all_users-posts-use_group_mentions-checkbox').then((btn) => {
            if (btn.hasClass('checked')) {
                btn.click();
            }
            saveConfig();
            cy.apiLogin(regularUser);
            assertGroupMentionDisabled(groupName);
        });
    });
    after(() => {
        cy.apiAdminLogin();
        cy.visit('/admin_console/user_management/permissions/system_scheme');
        cy.findByTestId('resetPermissionsToDefault').click();
        cy.get('#confirmModalButton').click();
        saveConfig();
    });
});