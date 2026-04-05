import {Channel} from '@mattermost/types/channels';
import {Team} from '@mattermost/types/teams';
import {UserProfile} from '@mattermost/types/users';
import {AdminConfig} from '@mattermost/types/config';
import * as TIMEOUTS from '../../../../fixtures/timeouts';
function setLDAPTestSettings(config: AdminConfig) {
    return {
        siteName: config.TeamSettings.SiteName,
        siteUrl: config.ServiceSettings.SiteURL,
        teamName: '',
        user: null,
    };
}
context('ldap', () => {
    let testChannel: Channel;
    let testTeam: Team;
    let testUser: UserProfile;
    describe('LDAP Group Sync Automated Tests', () => {
        beforeEach(() => {
            cy.apiAdminLogin();
            cy.apiRequireLicenseForFeature('LDAP');
            cy.apiInitSetup().then(({team, user}) => {
                testTeam = team;
                testUser = user;
                cy.apiGetConfig().then(({config}) => {
                    setLDAPTestSettings(config);
                });
                cy.visit('/admin_console/user_management/groups');
                cy.get('#board_group').then((el) => {
                    if (!el.text().includes('Edit')) {
                        if (el.find('.icon.fa-unlink').length > 0) {
                            el.find('.icon.fa-unlink').click();
                        }
                    }
                });
                cy.visit('/admin_console/user_management/groups');
                cy.get('#developers_group').then((el) => {
                    if (!el.text().includes('Edit')) {
                        if (el.find('.icon.fa-unlink').length > 0) {
                            el.find('.icon.fa-unlink').click();
                        }
                    }
                });
                cy.apiCreateChannel(testTeam.id, 'ldap-group-sync-automated-tests', 'ldap-group-sync-automated-tests').then(({channel}) => {
                    testChannel = channel;
                });
            });
        });
        it('MM-T1537 - Sync Group Removal from Channel Configuration Page', () => {
            cy.visit(`/admin_console/user_management/channels/${testChannel.id}`);
            cy.get('.admin-console__header', {timeout: TIMEOUTS.ONE_MIN}).should('be.visible').and('have.text', 'Channel Configuration');
            cy.wait(TIMEOUTS.TWO_SEC);
            cy.get('#addGroupsToChannelToggle').click();
            cy.get('#multiSelectList').should('be.visible');
            cy.get('#multiSelectList>div').children().eq(0).click();
            cy.uiGetButton('Add').click();
            cy.get('#addGroupsToChannelToggle').click();
            cy.get('#multiSelectList').should('be.visible');
            cy.get('#multiSelectList>div').children().eq(0).click();
            cy.uiGetButton('Add').click();
            cy.get('#saveSetting').should('be.enabled').click();
            cy.get('.admin-console__header', {timeout: TIMEOUTS.ONE_MIN}).should('be.visible').and('have.text', 'Mattermost Channels');
            cy.visit(`/admin_console/user_management/channels/${testChannel.id}`);
            cy.get('.admin-console__header', {timeout: TIMEOUTS.ONE_MIN}).should('be.visible').and('have.text', 'Channel Configuration');
            cy.get('.group-row').eq(0).scrollIntoView().should('be.visible').within(() => {
                cy.get('.group-name').should('have.text', 'board');
                cy.get('.group-actions > a').should('have.text', 'Remove').click();
            });
            cy.get('#saveSetting').should('be.enabled').click();
            cy.get('.admin-console__header', {timeout: TIMEOUTS.ONE_MIN}).should('be.visible').and('have.text', 'Mattermost Channels');
            cy.visit(`/admin_console/user_management/channels/${testChannel.id}`);
            cy.get('.admin-console__header', {timeout: TIMEOUTS.ONE_MIN}).should('be.visible').and('have.text', 'Channel Configuration');
            cy.get('.group-row').should('have.length', 1);
        });
        it('MM-T2618 - Team Configuration Page: Group removal User removed from sync\'ed team', () => {
            cy.visit(`/admin_console/user_management/teams/${testTeam.id}`);
            cy.get('.admin-console__header', {timeout: TIMEOUTS.ONE_MIN}).should('be.visible').and('have.text', 'Team Configuration');
            cy.wait(TIMEOUTS.TWO_SEC);
            cy.findByTestId('syncGroupSwitch').
                scrollIntoView().
                findByRole('button').
                click({force: true});
            cy.get('#addGroupsToTeamToggle').scrollIntoView().click();
            cy.get('#multiSelectList').should('be.visible');
            cy.get('#multiSelectList>div').children().eq(0).click();
            cy.uiGetButton('Add').click().wait(TIMEOUTS.ONE_SEC);
            cy.get('#saveSetting').should('be.enabled').click();
            cy.get('#confirmModalButton').should('be.visible').click();
            cy.get('.admin-console__header', {timeout: TIMEOUTS.ONE_MIN}).should('be.visible').and('have.text', 'Mattermost Teams');
            cy.visit('/admin_console/user_management/groups');
            cy.get('#board_edit').click();
            cy.findByTestId(`${testTeam.display_name}_groupsyncable_remove`).click();
            cy.get('#confirmModalBody').should('be.visible').and('have.text', `Removing this membership will prevent future users in this group from being added to the ${testTeam.display_name} team.`);
            cy.get('#confirmModalButton').should('be.visible').click();
            cy.get('#saveSetting').click();
        });
        it('MM-T2621 - Team List Management Column', () => {
            let testTeam2: Team;
            cy.visit(`/admin_console/user_management/teams/${testTeam.id}`);
            cy.get('.admin-console__header', {timeout: TIMEOUTS.ONE_MIN}).should('be.visible').and('have.text', 'Team Configuration');
            cy.wait(TIMEOUTS.TWO_SEC);
            cy.findByTestId('allowAllToggleSwitch').scrollIntoView().click();
            cy.get('#saveSetting').should('be.enabled').click();
            cy.get('.admin-console__header', {timeout: TIMEOUTS.ONE_MIN}).should('be.visible').and('have.text', 'Mattermost Teams');
            cy.apiCreateTeam('team', 'Team').then(({team}) => {
                testTeam2 = team;
                cy.visit('/admin_console/user_management/teams');
                cy.get('.DataGrid_searchBar').within(() => {
                    cy.findByPlaceholderText('Search').should('be.visible').type(`${testTeam.display_name}{enter}`);
                });
                cy.findByTestId(`${testTeam.name}Management`).should('have.text', 'Anyone Can Join');
                cy.get('.DataGrid_searchBar').within(() => {
                    cy.findByPlaceholderText('Search').should('be.visible').clear().type(`${testTeam2.display_name}{enter}`);
                });
                cy.findByTestId(`${testTeam2.name}Management`).should('have.text', 'Invite Only');
            });
        });
        it('MM-T2628 - List of Channels', () => {
            cy.visit(`/admin_console/user_management/channels/${testChannel.id}`);
            cy.get('.admin-console__header', {timeout: TIMEOUTS.ONE_MIN}).should('be.visible').and('have.text', 'Channel Configuration');
            cy.wait(TIMEOUTS.TWO_SEC);
            cy.findByTestId('allow-all-toggle').click();
            cy.get('#cancelButtonSettings').click();
            cy.get('#confirmModalButton').click();
            cy.visit(`/admin_console/user_management/channels/${testChannel.id}`);
            cy.get('.admin-console__header', {timeout: TIMEOUTS.ONE_MIN}).should('be.visible').and('have.text', 'Channel Configuration');
            cy.findByTestId('allow-all-toggle').should('has.have.text', 'Public');
            cy.findByTestId('allow-all-toggle').click();
            cy.get('#saveSetting').should('be.enabled').click();
            cy.get('#confirmModalButton').click();
            cy.visit(`/admin_console/user_management/channels/${testChannel.id}`);
            cy.get('.admin-console__header', {timeout: TIMEOUTS.ONE_MIN}).should('be.visible').and('have.text', 'Channel Configuration');
            cy.findByTestId('allow-all-toggle').should('has.have.text', 'Private');
            cy.visit(`/${testTeam.name}`);
            cy.uiBrowseOrCreateChannel('Browse channels');
            cy.get('#searchChannelsTextbox').type(testChannel.display_name);
            cy.get('#moreChannelsList').should('include.text', testChannel.display_name);
        });
        it('MM-T2629 - Private to public - More....', () => {
            cy.apiCreateChannel(
                testTeam.id,
                'private-channel-test',
                'Private channel',
                'P',
            ).then(({channel}) => {
                const privateChannel = channel;
                cy.visit(`/admin_console/user_management/channels/${privateChannel.id}`);
                cy.get('.admin-console__header', {timeout: TIMEOUTS.ONE_MIN}).should('be.visible').and('have.text', 'Channel Configuration');
                cy.findByTestId('allow-all-toggle').click();
                cy.get('#cancelButtonSettings').click();
                cy.get('#confirmModalButton').click();
                cy.get('.admin-console__header', {timeout: TIMEOUTS.ONE_MIN}).should('be.visible').and('have.text', 'Mattermost Channels');
                cy.visit(`/admin_console/user_management/channels/${privateChannel.id}`);
                cy.get('.admin-console__header', {timeout: TIMEOUTS.ONE_MIN}).should('be.visible').and('have.text', 'Channel Configuration');
                cy.wait(TIMEOUTS.THREE_SEC);
                cy.findByTestId('allow-all-toggle').should('has.have.text', 'Private').click();
                cy.get('#saveSetting').should('be.enabled').click();
                cy.get('#confirmModalButton').click();
                cy.get('.admin-console__header', {timeout: TIMEOUTS.ONE_MIN}).should('be.visible').and('have.text', 'Mattermost Channels');
                cy.visit(`/admin_console/user_management/channels/${privateChannel.id}`);
                cy.get('.admin-console__header', {timeout: TIMEOUTS.ONE_MIN}).should('be.visible').and('have.text', 'Channel Configuration');
                cy.findByTestId('allow-all-toggle').should('has.have.text', 'Public');
                cy.visit(`/${testTeam.name}/channels/${privateChannel.name}`);
                cy.getLastPostId().then((id) => {
                    cy.get(`#postMessageText_${id}`).should('contain', 'This channel has been converted to a Public Channel and can be joined by any team member');
                });
            });
        });
        it('MM-T2630 - Default channel cannot be toggled to private', () => {
            cy.visit('/admin_console/user_management/channels');
            cy.get('.DataGrid_searchBar').within(() => {
                cy.findByPlaceholderText('Search').should('be.visible').type('Town Square');
            });
            cy.wait(TIMEOUTS.FIVE_SEC);
            cy.findAllByTestId('town-squareedit').then((elements) => {
                elements[0].click();
                cy.get('.admin-console__header', {timeout: TIMEOUTS.ONE_MIN}).should('be.visible').and('have.text', 'Channel Configuration');
                cy.findByTestId('allow-all-toggle-button').should('be.disabled');
            });
        });
        it('MM-T2638 - Permalink from when public does not auto-join (non-system-admin) after converting to private', () => {
            cy.apiLogin(testUser);
            cy.visit(`/${testTeam.name}/channels/${testChannel.name}`);
            cy.postMessage('DONT YOU SEE I GOT EVERYTHING YOU NEED .... BABY BABY DONT YOU SEE SEE I GOT EVERYTHING YOU NEED NEED ... ;)');
            cy.getLastPostId().then((id) => {
                const postId = id;
                cy.visit(`/${testTeam.name}/channels/${testChannel.name}`);
                cy.postMessage('/leave ');
                cy.get('#channelHeaderTitle', {timeout: TIMEOUTS.ONE_MIN}).should('be.visible').and('contain', 'Town Square');
                cy.visit(`/${testTeam.name}/pl/${postId}`);
                cy.get('#channelHeaderTitle', {timeout: TIMEOUTS.ONE_MIN}).should('be.visible').and('contain', testChannel.display_name);
                cy.postMessage('/leave ');
                cy.get('#channelHeaderTitle', {timeout: TIMEOUTS.ONE_MIN}).should('be.visible').and('contain', 'Town Square');
                cy.apiAdminLogin();
                cy.apiPatchChannelPrivacy(testChannel.id, 'P');
                cy.apiLogin(testUser);
                cy.visit(`/${testTeam.name}/pl/${postId}`);
                cy.findByTestId('errorMessageTitle').contains('Message Not Found');
            });
        });
        it('MM-T2639 - Policy settings (in System Console tests, likely)', () => {
            cy.uiResetPermissionsToDefault();
            cy.apiLogin(testUser);
            cy.visit(`/${testTeam.name}/channels/${testChannel.name}`);
            cy.get('.member-rhs__trigger').click();
            cy.uiGetRHS().contains('button', 'Add').should('exist').click();
            cy.get('#addUsersToChannelModal').should('be.visible').findByText(`Add people to ${testChannel.display_name}`);
            cy.apiAdminLogin();
            cy.visit('/admin_console/user_management/permissions/system_scheme');
            cy.findByTestId('all_users-private_channel-checkbox').click();
            cy.uiSaveConfig();
            cy.apiPatchChannelPrivacy(testChannel.id, 'P');
            cy.apiLogin(testUser);
            cy.visit(`/${testTeam.name}/channels/${testChannel.name}`);
            cy.get('.member-rhs__trigger').click();
            cy.uiGetRHS().contains('button', 'Add').should('not.exist');
        });
        it('MM-T2640 - Channel appears in channel switcher before conversion but not after (for non-members of the channel)', () => {
            cy.uiResetPermissionsToDefault();
            cy.apiCreateChannel(
                testTeam.id,
                'a-channel-im-not-apart-off',
                'Public channel',
                'O',
            ).then(({channel: publicChannel}) => {
                cy.apiLogin(testUser);
                cy.visit(`/${testTeam.name}/channels/${testChannel.name}`);
                cy.uiOpenFindChannels();
                cy.get('#quickSwitchHint', {timeout: TIMEOUTS.TWO_SEC}).should('be.visible').should('contain', 'Type to find a channel. Use UP/DOWN to browse, ENTER to select, ESC to dismiss.');
                cy.wait(TIMEOUTS.THREE_SEC);
                cy.findByRole('combobox', {name: 'quick switch input'}).type(publicChannel.display_name);
                cy.wait(TIMEOUTS.HALF_SEC);
                cy.get('#suggestionList').should('be.visible').children().within((el) => {
                    cy.wrap(el).should('contain', publicChannel.display_name);
                });
                cy.apiAdminLogin();
                cy.apiPatchChannelPrivacy(publicChannel.id, 'P');
                cy.apiLogin(testUser);
                cy.visit(`/${testTeam.name}/channels/${testChannel.name}`);
                cy.uiOpenFindChannels();
                cy.get('#quickSwitchHint', {timeout: TIMEOUTS.TWO_SEC}).should('be.visible').should('contain', 'Type to find a channel. Use UP/DOWN to browse, ENTER to select, ESC to dismiss.');
                cy.wait(TIMEOUTS.THREE_SEC);
                cy.findByRole('combobox', {name: 'quick switch input'}).type(publicChannel.display_name);
                cy.wait(TIMEOUTS.HALF_SEC);
                cy.get('.no-results__title').should('be.visible').and('contain.text', 'No results for');
            });
        });
        it('MM-T2641 - Channel appears in More... under Public Channels before conversion but not after', () => {
            cy.apiCreateChannel(
                testTeam.id,
                'a-channel-im-not-apart-off',
                'Public channel',
                'O',
            ).then(({channel: publicChannel}) => {
                cy.apiLogin(testUser);
                cy.visit(`/${testTeam.name}/channels/off-topic`);
                cy.uiBrowseOrCreateChannel('Browse channels');
                cy.get('#searchChannelsTextbox').type(publicChannel.display_name);
                cy.get('#moreChannelsList').should('include.text', publicChannel.display_name);
                cy.apiAdminLogin();
                cy.apiPatchChannelPrivacy(publicChannel.id, 'P');
                cy.apiLogin(testUser);
                cy.visit(`/${testTeam.name}/channels/off-topic`);
                cy.uiBrowseOrCreateChannel('Browse channels');
                cy.get('#searchChannelsTextbox').type(publicChannel.display_name);
                cy.get('#moreChannelsList').should('include.text', 'No results for');
            });
        });
        it('MM-T2642 - Channel appears in Integrations options before conversion but not after', () => {
            cy.visit(`/${testTeam.name}/channels/${testChannel.name}`);
            cy.visit(`/${testTeam.name}/integrations`);
            cy.get('#outgoingWebhooks', {timeout: TIMEOUTS.ONE_MIN}).should('be.visible').click();
            cy.get('#addOutgoingWebhook', {timeout: TIMEOUTS.ONE_MIN}).should('be.visible').click();
            cy.get('#channelSelect').children().should('contain.text', testChannel.display_name);
            cy.apiPatchChannelPrivacy(testChannel.id, 'P');
            cy.visit(`/${testTeam.name}/integrations`);
            cy.get('#outgoingWebhooks', {timeout: TIMEOUTS.ONE_MIN}).should('be.visible').click();
            cy.get('#addOutgoingWebhook', {timeout: TIMEOUTS.ONE_MIN}).should('be.visible').click();
            cy.get('#channelSelect').children().should('not.contain.text', testChannel.display_name);
        });
    });
});