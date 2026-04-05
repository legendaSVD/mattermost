import {Channel} from '@mattermost/types/channels';
import {Team} from '@mattermost/types/teams';
import {UserProfile} from '@mattermost/types/users';
import * as TIMEOUTS from '../../../../../fixtures/timeouts';
import {getRandomId} from '../../../../../utils';
import {checkboxesTitleToIdMap} from './constants';
import {
    deleteOrEditTeamScheme,
    disablePermission,
    enablePermission,
    goToPermissionsAndCreateTeamOverrideScheme,
    goToSystemScheme,
    saveConfigForChannel,
    saveConfigForScheme,
    viewManageChannelMembersRHS,
    visitChannel,
    visitChannelConfigPage,
} from './helpers';
function addButtonExists() {
    cy.uiGetRHS().contains('button', 'Add').should('be.visible');
}
function addButtonDoesNotExists() {
    cy.uiGetRHS().contains('button', 'Add').should('not.exist');
}
describe('MM-23102 - Channel Moderation - Manage Members', () => {
    let regularUser: UserProfile;
    let guestUser: UserProfile;
    let testTeam: Team;
    let testChannel: Channel;
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
    it('MM-T1547 No option to Manage Members for Guests', () => {
        visitChannelConfigPage(testChannel);
        cy.findByTestId(checkboxesTitleToIdMap.MANAGE_MEMBERS_GUESTS).should('not.exist');
        visitChannel(guestUser, testChannel, testTeam);
        viewManageChannelMembersRHS();
        addButtonDoesNotExists();
    });
    it('MM-T1548 Manage Members option for Members', () => {
        visitChannelConfigPage(testChannel);
        disablePermission(checkboxesTitleToIdMap.MANAGE_MEMBERS_MEMBERS);
        saveConfigForChannel();
        visitChannel(regularUser, testChannel, testTeam);
        viewManageChannelMembersRHS();
        addButtonDoesNotExists();
        cy.uiGetRHS().contains('button', 'Add').should('not.exist');
        visitChannelConfigPage(testChannel);
        enablePermission(checkboxesTitleToIdMap.MANAGE_MEMBERS_MEMBERS);
        saveConfigForChannel();
        visitChannel(regularUser, testChannel, testTeam);
        viewManageChannelMembersRHS();
        addButtonExists();
    });
    it('MM-T1549 Manage Members option removed for Members in System Scheme', () => {
        goToSystemScheme();
        disablePermission(checkboxesTitleToIdMap.ALL_USERS_MANAGE_PUBLIC_CHANNEL_MEMBERS);
        saveConfigForScheme();
        visitChannelConfigPage(testChannel);
        cy.findByTestId('admin-channel_settings-channel_moderation-manageMembers-disabledMember').
            should('exist').
            and('have.text', 'Manage members for members are disabled in System Scheme.');
        cy.findByTestId(checkboxesTitleToIdMap.MANAGE_MEMBERS_MEMBERS).should('be.disabled');
        cy.findByTestId(checkboxesTitleToIdMap.MANAGE_MEMBERS_GUESTS).should('not.exist');
        visitChannel(regularUser, testChannel, testTeam);
        viewManageChannelMembersRHS();
        addButtonDoesNotExists();
        goToSystemScheme();
        enablePermission(checkboxesTitleToIdMap.ALL_USERS_MANAGE_PUBLIC_CHANNEL_MEMBERS);
        saveConfigForScheme();
        visitChannelConfigPage(testChannel);
        cy.findByTestId('admin-channel_settings-channel_moderation-manageMembers-disabledMember').
            should('not.exist');
        visitChannel(regularUser, testChannel, testTeam);
        viewManageChannelMembersRHS();
        addButtonExists();
    });
    it('MM-T1550 Manage Members option removed for Members in Team Override Scheme', () => {
        const teamOverrideSchemeName = `manage_members_${getRandomId()}`;
        goToPermissionsAndCreateTeamOverrideScheme(teamOverrideSchemeName, testTeam);
        deleteOrEditTeamScheme(teamOverrideSchemeName, 'edit');
        disablePermission(checkboxesTitleToIdMap.ALL_USERS_MANAGE_PUBLIC_CHANNEL_MEMBERS);
        saveConfigForScheme(false);
        cy.wait(TIMEOUTS.FIVE_SEC);
        visitChannelConfigPage(testChannel);
        cy.findByTestId('admin-channel_settings-channel_moderation-manageMembers-disabledMember').
            should('exist').
            and('have.text', `Manage members for members are disabled in ${teamOverrideSchemeName} Team Scheme.`);
        cy.findByTestId(checkboxesTitleToIdMap.MANAGE_MEMBERS_MEMBERS).should('be.disabled');
        cy.findByTestId(checkboxesTitleToIdMap.MANAGE_MEMBERS_GUESTS).should('not.exist');
        visitChannel(regularUser, testChannel, testTeam);
        viewManageChannelMembersRHS();
        addButtonDoesNotExists();
        deleteOrEditTeamScheme(teamOverrideSchemeName, 'edit');
        enablePermission(checkboxesTitleToIdMap.ALL_USERS_MANAGE_PUBLIC_CHANNEL_MEMBERS);
        saveConfigForScheme(false);
        cy.wait(TIMEOUTS.FIVE_SEC);
        visitChannelConfigPage(testChannel);
        cy.findByTestId('admin-channel_settings-channel_moderation-manageMembers-disabledMember').
            should('not.exist');
        cy.findByTestId(checkboxesTitleToIdMap.MANAGE_MEMBERS_MEMBERS).should('have.class', 'checkbox checked');
        cy.findByTestId(checkboxesTitleToIdMap.MANAGE_MEMBERS_GUESTS).should('not.exist');
        visitChannel(regularUser, testChannel, testTeam);
        viewManageChannelMembersRHS();
        addButtonExists();
    });
});