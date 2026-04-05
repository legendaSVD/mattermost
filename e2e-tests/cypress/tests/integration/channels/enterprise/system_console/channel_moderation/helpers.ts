import {Channel} from '@mattermost/types/channels';
import {UserProfile} from '@mattermost/types/users';
import {Team} from '@mattermost/types/teams';
import * as TIMEOUTS from '../../../../../fixtures/timeouts';
import {getAdminAccount} from '../../../../../support/env';
import {checkBoxes} from './constants';
export const visitChannelConfigPage = (channel: Channel) => {
    cy.apiAdminLogin();
    cy.visit('/admin_console/user_management/channels');
    cy.get('.DataGrid_searchBar').within(() => {
        cy.findByPlaceholderText('Search').type(`${channel.name}{enter}`);
    });
    cy.findByText('Edit').click();
    cy.wait(TIMEOUTS.ONE_SEC);
};
export const disablePermission = (permission) => {
    cy.waitUntil(() => cy.findByTestId(permission).scrollIntoView().should('be.visible').then((el) => {
        const classAttribute = el[0].getAttribute('class');
        if (classAttribute.includes('checked') || classAttribute.includes('intermediate')) {
            el[0].click();
            return false;
        }
        return true;
    }));
    cy.findByTestId(permission).should('not.have.class', 'checked');
};
export const saveConfigForChannel = (channelName: string = null, clickConfirmationButton = false) => {
    cy.get('#saveSetting').then((btn) => {
        if (btn.is(':enabled')) {
            btn.click();
            if (clickConfirmationButton) {
                cy.get('#confirmModalButton').click();
            }
            cy.waitUntil(() => cy.location().then((location) => {
                return location.href.endsWith('/admin_console/user_management/channels');
            }));
            cy.get('.DataGrid_searchBar').should('be.visible').within(() => {
                cy.findByPlaceholderText('Search').should('be.visible');
            });
            if (channelName) {
                cy.get('.DataGrid_searchBar').within(() => {
                    cy.findByPlaceholderText('Search').type(`${channelName}{enter}`);
                });
                cy.findByText('Edit').click();
            }
        }
    });
};
export const visitChannel = (user: UserProfile, channel: Channel, team: Team) => {
    cy.apiLogin(user);
    cy.visit(`/${team.name}/channels/${channel.name}`);
    cy.get('#postListContent', {timeout: TIMEOUTS.ONE_MIN}).should('be.visible');
};
export const postChannelMentionsAndVerifySystemMessageExist = (channelName: string) => {
    function getSystemMessage(text) {
        return `Channel notifications are disabled in ${channelName}. The ${text} did not trigger any notifications.`;
    }
    cy.postMessage('@all ');
    cy.getLastPostId().then((postId) => {
        cy.get(`#postMessageText_${postId}`).should('include.text', getSystemMessage('@all'));
    });
    cy.postMessage('@here ');
    cy.getLastPostId().then((postId) => {
        cy.get(`#postMessageText_${postId}`).should('include.text', getSystemMessage('@here'));
    });
    cy.postMessage('@channel ');
    cy.getLastPostId().then((postId) => {
        cy.get(`#postMessageText_${postId}`).should('include.text', getSystemMessage('@channel'));
    });
};
export const enablePermission = (permission) => {
    cy.waitUntil(() => cy.findByTestId(permission).scrollIntoView().should('be.visible').then((el) => {
        const classAttribute = el[0].getAttribute('class');
        if (!classAttribute.includes('checked')) {
            el[0].click();
            return false;
        }
        return true;
    }));
    cy.findByTestId(permission).should('have.class', 'checked');
};
export const postChannelMentionsAndVerifySystemMessageNotExist = (channel: Channel) => {
    function getSystemMessage(text) {
        return `Channel notifications are disabled in ${channel.name}. The ${text} did not trigger any notifications.`;
    }
    cy.postMessage('@all ');
    cy.getLastPostId().then((postId) => {
        cy.get(`#postMessageText_${postId}`).should('not.have.text', getSystemMessage('@all'));
    });
    cy.postMessage('@here ');
    cy.getLastPostId().then((postId) => {
        cy.get(`#postMessageText_${postId}`).should('not.have.text', getSystemMessage('@here'));
    });
    cy.postMessage('@channel ');
    cy.getLastPostId().then((postId) => {
        cy.get(`#postMessageText_${postId}`).should('not.have.text', getSystemMessage('@channel'));
    });
};
const waitUntilConfigSave = () => {
    cy.waitUntil(() => cy.get('#saveSetting').then((el) => {
        return el[0].innerText === 'Save';
    }));
};
export const saveConfigForScheme = (waitUntilConfigSaved = true, clickConfirmationButton = false) => {
    cy.get('#saveSetting').then((btn) => {
        if (btn.is(':enabled')) {
            btn.click();
        }
    });
    if (clickConfirmationButton) {
        cy.get('#confirmModalButton').click();
    }
    if (waitUntilConfigSaved) {
        waitUntilConfigSave();
    }
};
export const goToSystemScheme = () => {
    cy.apiAdminLogin();
    cy.visit('/admin_console/user_management/permissions/system_scheme');
    cy.get('.admin-console__header', {timeout: TIMEOUTS.ONE_MIN}).should('be.visible').and('have.text', 'System Scheme');
};
export const goToPermissionsAndCreateTeamOverrideScheme = (schemeName: string, team: Team) => {
    cy.apiAdminLogin();
    cy.visit('/admin_console/user_management/permissions');
    cy.findByTestId('team-override-schemes-link').click();
    cy.get('#scheme-name').type(schemeName);
    cy.findByTestId('add-teams').click();
    cy.get('#selectItems input').typeWithForce(team.display_name);
    cy.get('#multiSelectList').should('be.visible').children().first().click({force: true});
    cy.get('#saveItems').should('be.visible').click();
    saveConfigForScheme(false);
    cy.wait(TIMEOUTS.ONE_SEC);
};
export const deleteOrEditTeamScheme = (schemeDisplayName: string, editOrDelete: string) => {
    cy.apiAdminLogin();
    cy.visit('/admin_console/user_management/permissions');
    cy.findByTestId(`${schemeDisplayName}-${editOrDelete}`).click();
    if (editOrDelete === 'delete') {
        cy.get('#confirmModalButton').click();
    }
};
export const viewManageChannelMembersRHS = () => {
    cy.get('.member-rhs__trigger').click();
};
export const enableDisableAllChannelModeratedPermissionsViaAPI = (channel: Channel, enable = true) => {
    cy.externalRequest(
        {
            user: getAdminAccount(),
            method: 'PUT',
            path: `channels/${channel.id}/moderations/patch`,
            data:
                [
                    {
                        name: 'create_post',
                        roles: {
                            members: enable,
                            guests: enable,
                        },
                    },
                    {
                        name: 'create_reactions',
                        roles: {
                            members: enable,
                            guests: enable,
                        },
                    },
                    {
                        name: 'manage_members',
                        roles: {
                            members: enable,
                        },
                    },
                    {
                        name: 'use_channel_mentions',
                        roles: {
                            members: enable,
                            guests: enable,
                        },
                    },
                    {
                        name: 'manage_bookmarks',
                        roles: {
                            members: enable,
                        },
                    },
                ],
        },
    );
};
export const resetSystemSchemePermissionsToDefault = () => {
    cy.apiAdminLogin();
    cy.visit('/admin_console/user_management/permissions/system_scheme');
    cy.findByTestId('resetPermissionsToDefault').click();
    cy.get('#confirmModalButton').click();
    saveConfigForScheme();
};
export const demoteToChannelOrTeamMember = (userId: string, id: string, channelsOrTeams = 'channels') => {
    cy.externalRequest({
        user: getAdminAccount(),
        method: 'put',
        path: `${channelsOrTeams}/${id}/members/${userId}/schemeRoles`,
        data: {
            scheme_user: true,
            scheme_admin: false,
        },
    });
};
export const promoteToChannelOrTeamAdmin = (userId: string, id: string, channelsOrTeams = 'channels') => {
    cy.externalRequest({
        user: getAdminAccount(),
        method: 'put',
        path: `${channelsOrTeams}/${id}/members/${userId}/schemeRoles`,
        data: {
            scheme_user: true,
            scheme_admin: true,
        },
    });
};
export const disableAllChannelModeratedPermissions = () => {
    checkBoxes.forEach((buttonId) => {
        cy.findByTestId(buttonId).then((btn) => {
            if (btn.hasClass('checked')) {
                btn.click();
            }
        });
    });
};
export const enableAllChannelModeratedPermissions = () => {
    checkBoxes.forEach((buttonId) => {
        cy.findByTestId(buttonId).then((btn) => {
            if (!btn.hasClass('checked')) {
                btn.click();
            }
        });
    });
};