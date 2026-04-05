import {Channel} from '@mattermost/types/channels';
import {Team} from '@mattermost/types/teams';
import {UserProfile} from '@mattermost/types/users';
import * as TIMEOUTS from '../../../../fixtures/timeouts';
describe('Verify Accessibility Support in Modals & Dialogs', () => {
    let testTeam: Team;
    let testChannel: Channel;
    let testUser: UserProfile;
    before(() => {
        cy.apiRequireLicenseForFeature('GuestAccounts');
        cy.apiInitSetup({userPrefix: 'user000a'}).then(({team, channel, user}) => {
            testTeam = team;
            testChannel = channel;
            testUser = user;
            cy.apiCreateUser().then(({user: newUser}) => {
                cy.apiAddUserToTeam(testTeam.id, newUser.id).then(() => {
                    cy.apiAddUserToChannel(testChannel.id, newUser.id);
                });
            });
        });
    });
    beforeEach(() => {
        cy.apiAdminLogin();
        cy.visit(`/${testTeam.name}/channels/town-square`);
    });
    it('MM-T1454 Accessibility Support in Different Modals and Dialog screen', () => {
        verifyUserMenuModal('Profile');
        verifyMainMenuModal('Team settings');
        verifyMainMenuModal('Manage Members', `${testTeam.display_name} Members`);
        cy.visit(`/${testTeam.name}/channels/off-topic`);
        verifyChannelMenuModal('Edit Channel Header', 'Edit Header for Off-Topic');
        cy.wait(TIMEOUTS.TWO_SEC);
        verifyChannelMenuModal('Edit Channel Purpose', 'Edit Purpose for Off-Topic');
        verifyChannelMenuModal('Rename Channel');
    });
    it('MM-T1487 Accessibility Support in Manage Channel Members Dialog screen', () => {
        cy.visit(`/${testTeam.name}/channels/off-topic`);
        cy.get('#channelHeaderTitle').click();
        cy.findByText('Manage members').click().wait(TIMEOUTS.FIVE_SEC);
        cy.findByRole('dialog', {name: 'Off-Topic Members'}).within(() => {
            cy.findByRole('heading', {name: 'Off-Topic Members'});
            cy.findByPlaceholderText('Search users').
                focus().
                type(' {backspace}').
                wait(TIMEOUTS.HALF_SEC).
                tab({shift: true}).tab();
            cy.wait(TIMEOUTS.HALF_SEC);
            cy.focused().tab();
            cy.findByAltText('sysadmin profile image').should('be.focused');
            cy.focused().tab();
            cy.focused().should('have.text', '@sysadmin');
            cy.focused().tab();
            cy.findByAltText(`${testUser.username} profile image`).should('be.focused');
            cy.focused().tab();
            cy.focused().should('have.text', `@${testUser.username}`);
            cy.focused().tab();
            cy.focused().should('have.class', 'dropdown-toggle').and('contain', 'Channel Member');
            cy.get('#searchableUserListTotal').should('have.attr', 'aria-live', 'polite');
        });
    });
});
function verifyMainMenuModal(menuItem: string, modalName?: string) {
    cy.uiGetLHSHeader().click();
    verifyModal(menuItem, modalName);
}
function verifyChannelMenuModal(menuItem: string, modalName?: string) {
    cy.get('#channelHeaderTitle').click();
    verifyModal(menuItem, modalName);
}
function verifyUserMenuModal(menuItem) {
    cy.uiGetSetStatusButton().click();
    verifyModal(menuItem);
}
function verifyModal(menuItem: string, modalName?: string) {
    cy.findByRole('menu');
    cy.findByText(menuItem).click();
    const name = modalName || menuItem;
    cy.findByRole('dialog', {name}).within(() => {
        cy.findByRole('heading', {name});
        cy.uiClose();
    });
}