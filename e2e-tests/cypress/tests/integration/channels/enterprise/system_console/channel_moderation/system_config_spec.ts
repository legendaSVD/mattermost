import {Channel} from '@mattermost/types/channels';
import {Team} from '@mattermost/types/teams';
import {UserProfile} from '@mattermost/types/users';
import * as TIMEOUTS from '../../../../../fixtures/timeouts';
import {checkBoxes} from './constants';
import {
    disableAllChannelModeratedPermissions,
    enableAllChannelModeratedPermissions,
    saveConfigForChannel,
} from './helpers';
describe('Channel Moderation', () => {
    let guestUser: UserProfile;
    let testTeam: Team;
    let testChannel: Channel;
    before(() => {
        cy.apiRequireLicense();
        cy.apiInitSetup().then(({team, channel}) => {
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
    it('MM-22276 - Enable and Disable all channel moderated permissions', () => {
        cy.apiAdminLogin();
        cy.visit('/admin_console/user_management/channels');
        cy.get('.DataGrid_searchBar').within(() => {
            cy.findByPlaceholderText('Search').type(`${testChannel.name}{enter}`);
        });
        cy.findByText('Edit').click();
        cy.wait(TIMEOUTS.ONE_SEC);
        enableAllChannelModeratedPermissions();
        saveConfigForChannel(testChannel.display_name);
        cy.wait(TIMEOUTS.ONE_SEC);
        checkBoxes.forEach((buttonId) => {
            cy.findByTestId(buttonId).should('have.class', 'checked');
        });
        disableAllChannelModeratedPermissions();
        saveConfigForChannel(testChannel.display_name);
        cy.wait(TIMEOUTS.ONE_SEC);
        checkBoxes.forEach((buttonId) => {
            cy.findByTestId(buttonId).should('not.have.class', 'checked');
            if (buttonId.includes('use_channel_mentions')) {
                cy.findByTestId(buttonId).should('be.disabled');
                return;
            }
            cy.findByTestId(buttonId).should('not.be.disabled');
        });
    });
});