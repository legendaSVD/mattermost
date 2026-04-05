import * as TIMEOUTS from '../../../../../fixtures/timeouts';
import {getAdminAccount} from '../../../../../support/env';
import {promoteToChannelOrTeamAdmin} from '../channel_moderation/helpers.ts';
describe('System console', () => {
    const sysadmin = getAdminAccount();
    let teamAdmin;
    let regularUser;
    let teamName;
    let privateChannelName;
    before(() => {
        cy.shouldNotRunOnCloudEdition();
        cy.apiRequireLicense();
        setChannelPermission();
        cy.apiInitSetup({userPrefix: 'regular-user'}).then(({team, user}) => {
            teamName = team.name;
            regularUser = user;
            cy.apiCreateUser({prefix: 'team-admin'}).then(({user: newUser}) => {
                cy.apiAddUserToTeam(team.id, newUser.id).then(() => {
                    teamAdmin = newUser;
                    promoteToChannelOrTeamAdmin(teamAdmin.id, team.id, 'teams');
                    cy.apiCreateChannel(team.id, 'private', 'Private', 'P').then(({channel}) => {
                        privateChannelName = channel.name;
                        Cypress._.forEach([teamAdmin.id, regularUser.id], (userId) => cy.apiAddUserToChannel(channel.id, userId));
                    });
                });
            });
        });
    });
    it('MM-41397 - License page shows upgrade to Enterprise Advanced for Enterprise licenses', () => {
        cy.visit('/admin_console/about/license');
        cy.get('.admin-console__header').
            should('be.visible').
            and('have.text', 'Edition and License');
        cy.get('.EnterpriseEditionRightPannel').
            should('be.visible').
            within(() => {
                cy.get('.upgrade-title').should('have.text', 'Upgrade to Enterprise Advanced');
                cy.findByText('Attribute-based access control');
                cy.findByText('Channel warning banners');
                cy.findByText('AD/LDAP group sync');
                cy.findByText('Advanced workflows with Playbooks');
                cy.findByText('High availability');
                cy.findByText('Advanced compliance');
                cy.findByText('And more...');
                cy.findByRole('button', {name: 'Contact Sales'});
            });
        cy.findByRole('link', {name: 'Compare Plans'}).should('not.exist');
    });
    it('MM-T1201 - Remove and re-add license - Permissions freeze in place when license is removed (and then re-added)', () => {
        verifyUserChannelPermission(teamName, privateChannelName, sysadmin, teamAdmin, regularUser);
        cy.apiAdminLogin();
        cy.apiDeleteLicense();
        verifyUserChannelPermission(teamName, privateChannelName, sysadmin, teamAdmin, regularUser);
        cy.apiAdminLogin();
        cy.apiRequireLicense();
        verifyUserChannelPermission(teamName, privateChannelName, sysadmin, teamAdmin, regularUser);
    });
});
function setChannelPermission() {
    cy.visit('admin_console/user_management/permissions/system_scheme');
    cy.findByTestId('resetPermissionsToDefault').click();
    cy.get('#confirmModalButton').click();
    cy.findByTestId('all_users-public_channel-create_public_channel-checkbox').click();
    cy.findByTestId('all_users-private_channel-manage_private_channel_properties-checkbox').click();
    cy.findByTestId('team_admin-private_channel-manage_private_channel_properties-checkbox').click();
    cy.findByTestId('saveSetting').click();
}
function verifyCreatePublicChannel(teamName, testUsers) {
    for (const testUser of testUsers) {
        const {user, canCreate, isSysadmin} = testUser;
        cy.apiLogin(user);
        cy.visit(`/${teamName}/channels/town-square`);
        cy.uiBrowseOrCreateChannel('Create new channel');
        cy.findByRole('dialog', {name: 'Create a new channel'}).within(() => {
            cy.get('#public-private-selector-button-O').should(isSysadmin || canCreate ? 'not.have.class' : 'have.class', 'disabled');
            cy.get('#public-private-selector-button-P').should('not.have.class', 'disabled');
        });
    }
}
function verifyRenamePrivateChannel(teamName, privateChannelName, testUsers) {
    for (const testUser of testUsers) {
        const {user, canRename} = testUser;
        cy.apiLogin(user);
        cy.visit(`/${teamName}/channels/${privateChannelName}`);
        cy.get('#channelHeaderTitle', {timeout: TIMEOUTS.TWO_MIN}).should('be.visible').click();
        cy.get('#channelRename').should(canRename ? 'be.visible' : 'not.exist');
    }
}
function verifyUserChannelPermission(teamName, privateChannelName, sysadmin, teamAdmin, regularUser) {
    verifyCreatePublicChannel(teamName, [
        {user: sysadmin, canCreate: true, isSysadmin: true},
        {user: teamAdmin, canCreate: false},
        {user: regularUser, canCreate: false},
    ]);
    verifyRenamePrivateChannel(teamName, privateChannelName, [
        {user: sysadmin, canRename: true},
        {user: teamAdmin, canRename: true},
        {user: regularUser, canRename: false},
    ]);
}