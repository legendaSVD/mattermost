import {Team} from '@mattermost/types/teams';
import {UserProfile} from '@mattermost/types/users';
import {Channel} from '@mattermost/types/channels';
import {getAdminAccount} from '../../../support/env';
describe('Channel Type Conversion (Public to Private Only)', () => {
    let testUser: UserProfile;
    let testTeam: Team;
    const admin = getAdminAccount();
    const saveConfig = () => {
        cy.waitUntil(() =>
            cy.get('#saveSetting').then((button) => {
                if (button.text().trim() === 'Save') {
                    button.click();
                    return true;
                }
                return false;
            }),
        );
    };
    const enablePermission = (permissionCheckBoxTestId: string) => {
        cy.findByTestId(permissionCheckBoxTestId).then((el) => {
            if (!el.hasClass('checked')) {
                el.click();
            }
        });
    };
    const removePermission = (permissionCheckBoxTestId: string) => {
        cy.findByTestId(permissionCheckBoxTestId).then((el) => {
            if (el.hasClass('checked')) {
                el.click();
            }
        });
    };
    const promoteToChannelAdmin = (userId, channelId, admin) => {
        cy.externalRequest({
            user: admin,
            method: 'put',
            path: `channels/${channelId}/members/${userId}/schemeRoles`,
            data: {
                scheme_user: true,
                scheme_admin: true,
            },
        });
    };
    const resetPermissionsToDefault = () => {
        cy.apiAdminLogin();
        cy.visit('/admin_console/user_management/permissions/system_scheme');
        cy.findByTestId('resetPermissionsToDefault').click();
        cy.get('#confirmModalButton').click();
        saveConfig();
        cy.wait(1000);
        cy.visit('/admin_console/user_management/permissions/system_scheme');
    };
    const setupPermissions = (config: {
        resetToDefault?: boolean;
        publicToPrivate?: boolean;
        removeFromTeamAdmin?: boolean;
    }) => {
        if (config.resetToDefault) {
            resetPermissionsToDefault();
        }
        if (config.publicToPrivate) {
            enablePermission('all_users-public_channel-convert_public_channel_to_private-checkbox');
        } else if (config.publicToPrivate === false) {
            removePermission('all_users-public_channel-convert_public_channel_to_private-checkbox');
        }
        if (config.removeFromTeamAdmin) {
            removePermission('team_admin-public_channel-convert_public_channel_to_private-checkbox');
        }
        cy.wait(1000);
        saveConfig();
    };
    const createAndVisitPublicChannel = (teamName: string, channelId: string, displayName: string): Cypress.Chainable<Channel> => {
        return cy.apiCreateChannel(testTeam.id, channelId, displayName).then(({channel}) => {
            cy.apiAddUserToChannel(channel.id, testUser.id);
            cy.visit(`/${teamName}/channels/${channel.name}`);
            return cy.wrap(channel);
        });
    };
    const createAndVisitPrivateChannel = (teamName: string, channelId: string, displayName: string): Cypress.Chainable<Channel> => {
        return cy.apiCreateChannel(testTeam.id, channelId, displayName, 'P').then(({channel}) => {
            cy.apiAddUserToChannel(channel.id, testUser.id);
            cy.visit(`/${teamName}/channels/${channel.name}`);
            return cy.wrap(channel);
        });
    };
    const visitChannel = (teamName: string, channelName: string) => {
        cy.visit(`/${teamName}/channels/${channelName}`);
    };
    const openChannelSettingsModal = () => {
        cy.get('#channelHeaderDropdownButton').click();
        cy.findByText('Channel Settings').click();
        cy.get('.ChannelSettingsModal').should('be.visible');
    };
    const closeChannelSettingsModal = () => {
        cy.get('.GenericModal .modal-header button[aria-label="Close"]').click();
        cy.get('.ChannelSettingsModal').should('not.exist');
    };
    const saveChannelSettings = () => {
        cy.get('[data-testid="SaveChangesPanel__save-btn"]').click();
    };
    const verifySettingsSaved = () => {
        cy.get('.SaveChangesPanel').should('contain', 'Settings saved');
    };
    const convertChannelToPrivate = () => {
        cy.get('#public-private-selector-button-P').click();
        cy.get('#public-private-selector-button-P').should('have.class', 'selected');
        saveChannelSettings();
        cy.get('#confirmModal').should('be.visible');
        cy.get('#confirmModalButton').click();
        verifySettingsSaved();
        cy.get('#confirmModal').should('not.exist');
    };
    const verifyChannelIsPrivate = (channelName: string) => {
        cy.get('.SidebarChannel').contains(channelName).parent().find('.icon-lock-outline').should('exist');
    };
    const verifyConversionOptionDisabled = (toPrivate = true) => {
        if (toPrivate) {
            cy.wait(500);
            cy.get('#public-private-selector-button-P').then(($el) => {
                const isDisabled = $el.hasClass('disabled') || $el.prop('disabled') === true || $el.attr('aria-disabled') === 'true';
                expect(isDisabled).to.be.true;
            });
        } else {
            cy.wait(500);
            cy.get('#public-private-selector-button-O').then(($el) => {
                const isDisabled = $el.hasClass('disabled') || $el.prop('disabled') === true || $el.attr('aria-disabled') === 'true';
                expect(isDisabled).to.be.true;
            });
        }
    };
    const verifyConversionOptionEnabled = (toPrivate = true) => {
        if (toPrivate) {
            cy.wait(500);
            cy.get('#public-private-selector-button-P').then(($el) => {
                const isDisabled = $el.hasClass('disabled') || $el.prop('disabled') === true || $el.attr('aria-disabled') === 'true';
                expect(isDisabled).to.be.false;
            });
        } else {
            cy.wait(500);
            cy.get('#public-private-selector-button-O').then(($el) => {
                const isDisabled = $el.hasClass('disabled') || $el.prop('disabled') === true || $el.attr('aria-disabled') === 'true';
                expect(isDisabled).to.be.false;
            });
        }
    };
    const makeUserChannelAdmin = (channelId: string, userId: string) => {
        cy.apiAddUserToChannel(channelId, userId);
        promoteToChannelAdmin(userId, channelId, admin);
    };
    const makeUserTeamAdmin = (teamId: string, userId: string) => {
        cy.apiUpdateTeamMemberSchemeRole(teamId, userId, {scheme_admin: true, scheme_user: true});
    };
    before(() => {
        cy.apiInitSetup().then(({team, user}) => {
            testUser = user;
            testTeam = team;
        });
    });
    beforeEach(() => {
        cy.apiLogin(testUser);
    });
    describe('Basic Conversion Functionality', () => {
        it('MM-T3348-1 - Can convert a public channel to private', () => {
            setupPermissions({resetToDefault: true, publicToPrivate: true});
            createAndVisitPublicChannel(testTeam.name, 'public-to-private', 'Public To Private').then((channel) => {
                openChannelSettingsModal();
                convertChannelToPrivate();
                closeChannelSettingsModal();
                verifyChannelIsPrivate(channel.display_name);
            });
        });
        it('MM-T3348-5 - Cannot convert a private channel back to public', () => {
            setupPermissions({resetToDefault: true, publicToPrivate: true});
            createAndVisitPublicChannel(testTeam.name, 'private-stays-private', 'Private Stays Private').then((channel) => {
                openChannelSettingsModal();
                convertChannelToPrivate();
                closeChannelSettingsModal();
                verifyChannelIsPrivate(channel.display_name);
                openChannelSettingsModal();
                verifyConversionOptionDisabled(false);
                closeChannelSettingsModal();
            });
        });
    });
    describe('Role-Based Channel Type Conversion', () => {
        it('MM-T3350-1 - System admin cannot convert a private channel to public', () => {
            resetPermissionsToDefault();
            cy.apiAdminLogin();
            createAndVisitPrivateChannel(testTeam.name, 'sysadmin-private-stays-private', 'SysAdmin Private Channel').then(() => {
                openChannelSettingsModal();
                verifyConversionOptionDisabled(false);
                closeChannelSettingsModal();
            });
        });
        it('MM-T3350-2 - Channel admin cannot convert a private channel to public', () => {
            setupPermissions({resetToDefault: true});
            cy.apiLogin(testUser);
            createAndVisitPrivateChannel(testTeam.name, 'channel-admin-private', 'Channel Admin Private').then((channel) => {
                makeUserChannelAdmin(channel.id, testUser.id);
                visitChannel(testTeam.name, channel.name);
                openChannelSettingsModal();
                verifyConversionOptionDisabled(false);
                closeChannelSettingsModal();
            });
        });
        it('MM-T3350-3 - Team admin cannot convert a private channel to public', () => {
            setupPermissions({resetToDefault: true});
            makeUserTeamAdmin(testTeam.id, testUser.id);
            cy.apiLogin(testUser);
            createAndVisitPrivateChannel(testTeam.name, 'team-admin-private', 'Team Admin Private').then(() => {
                openChannelSettingsModal();
                verifyConversionOptionDisabled(false);
                closeChannelSettingsModal();
            });
        });
        it('MM-T3350-4 - Regular user cannot convert a private channel to public', () => {
            resetPermissionsToDefault();
            cy.apiCreateUser().then(({user: regularUser}) => {
                cy.apiAddUserToTeam(testTeam.id, regularUser.id);
                cy.apiAdminLogin();
                cy.apiCreateChannel(testTeam.id, 'admin-created-private', 'Admin Created Private', 'P').then(({channel}) => {
                    cy.apiAddUserToChannel(channel.id, regularUser.id);
                    cy.apiLogin(regularUser);
                    cy.visit(`/${testTeam.name}/channels/${channel.name}`);
                    openChannelSettingsModal();
                    verifyConversionOptionDisabled(false);
                    closeChannelSettingsModal();
                });
            });
        });
    });
    describe('Permission-Based Tests', () => {
        it('MM-T3348-2 - Regular user without permission cannot convert public to private', () => {
            setupPermissions({resetToDefault: true, publicToPrivate: false});
            cy.apiCreateUser().then(({user: regularUser}) => {
                cy.apiAddUserToTeam(testTeam.id, regularUser.id);
                cy.apiAdminLogin();
                cy.apiCreateChannel(testTeam.id, 'admin-created-public', 'Admin Created Public').then(({channel}) => {
                    cy.apiAddUserToChannel(channel.id, regularUser.id);
                    cy.apiLogin(regularUser);
                    cy.visit(`/${testTeam.name}/channels/${channel.name}`);
                    openChannelSettingsModal();
                    verifyConversionOptionDisabled(true);
                    closeChannelSettingsModal();
                });
            });
        });
        it('MM-T3348-3 - Team admin can convert public to private by default', () => {
            setupPermissions({resetToDefault: true});
            makeUserTeamAdmin(testTeam.id, testUser.id);
            createAndVisitPublicChannel(testTeam.name, 'team-admin-convert', 'Team Admin Convert').then((channel) => {
                openChannelSettingsModal();
                verifyConversionOptionEnabled(true);
                convertChannelToPrivate();
                closeChannelSettingsModal();
                verifyChannelIsPrivate(channel.display_name);
            });
        });
        it('MM-T3348-4 - Team admin cannot convert when permission is removed', () => {
            setupPermissions({
                resetToDefault: true,
                removeFromTeamAdmin: true,
            });
            makeUserTeamAdmin(testTeam.id, testUser.id);
            cy.apiAdminLogin();
            cy.apiCreateChannel(testTeam.id, 'admin-created-team-admin-no-perm', 'Admin Created Team Admin No Permission').then(({channel}) => {
                cy.apiAddUserToChannel(channel.id, testUser.id);
                cy.apiLogin(testUser);
                cy.visit(`/${testTeam.name}/channels/${channel.name}`);
                openChannelSettingsModal();
                verifyConversionOptionDisabled(true);
                closeChannelSettingsModal();
            });
        });
    });
    describe('Channel Admin Tests', () => {
        it('MM-T3349-1 - Channel admin can convert public to private when permission is enabled', () => {
            setupPermissions({resetToDefault: true, publicToPrivate: true});
            createAndVisitPublicChannel(testTeam.name, 'channel-admin-pub', 'Channel Admin Public').then((channel) => {
                makeUserChannelAdmin(channel.id, testUser.id);
                visitChannel(testTeam.name, channel.name);
                openChannelSettingsModal();
                verifyConversionOptionEnabled(true);
                convertChannelToPrivate();
                closeChannelSettingsModal();
                verifyChannelIsPrivate(channel.display_name);
            });
        });
        it('MM-T3349-2 - Channel admin cannot convert public to private when permission is removed', () => {
            const timestamp = Date.now();
            const channelId = `channel-admin-no-perm-${timestamp}`;
            const displayName = `Channel Admin No Permission ${timestamp}`;
            setupPermissions({resetToDefault: true, publicToPrivate: false, removeFromTeamAdmin: true});
            createAndVisitPublicChannel(testTeam.name, channelId, displayName).then((channel) => {
                makeUserChannelAdmin(channel.id, testUser.id);
                cy.apiLogin(testUser);
                cy.wait(500);
                visitChannel(testTeam.name, channel.name);
                cy.wait(500);
                openChannelSettingsModal();
                verifyConversionOptionDisabled(true);
                closeChannelSettingsModal();
            });
        });
    });
});