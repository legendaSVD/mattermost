import * as TIMEOUTS from '../../../fixtures/timeouts';
import {getAdminAccount} from '../../../support/env';
import {getRandomId} from '../../../utils';
function verifyChannelSwitch(displayName, url) {
    cy.get('#channelHeaderTitle', {timeout: TIMEOUTS.HALF_MIN}).should('be.visible').should('contain', displayName);
    cy.url().should('include', url);
}
describe('Channel sidebar', () => {
    const sysadmin = getAdminAccount();
    let testTeam;
    let testUser;
    before(() => {
        cy.apiInitSetup({loginAfter: true}).then(({team, user}) => {
            testTeam = team;
            testUser = user;
            cy.visit(`/${team.name}/channels/town-square`);
        });
    });
    it('should switch channels when clicking on a channel in the sidebar', () => {
        const teamName = `team-${getRandomId()}`;
        cy.createNewTeam(teamName, teamName);
        cy.uiGetLHSHeader().findByText(teamName);
        cy.get('.SidebarChannel:contains(Off-Topic)').should('be.visible').click();
        cy.url().should('include', `/${teamName}/channels/off-topic`);
        cy.get('#channelHeaderTitle', {timeout: TIMEOUTS.HALF_MIN}).should('be.visible').should('contain', 'Off-Topic');
        cy.get('.SidebarChannel:contains(Town Square)').should('be.visible').click();
        verifyChannelSwitch('Town Square', `/${teamName}/channels/town-square`);
    });
    it('should mark channel as read and unread in sidebar', () => {
        const teamName = `team-${getRandomId()}`;
        cy.createNewTeam(teamName, teamName);
        cy.uiGetLHSHeader().findByText(teamName);
        cy.get('.SidebarChannel:not(.unread):contains(Off-Topic)').should('be.visible');
        cy.get('.SidebarChannel:not(.unread):contains(Town Square)').should('be.visible');
        cy.apiGetChannelByName(teamName, 'off-topic').then(({channel}) => {
            cy.postMessageAs({sender: sysadmin, message: 'Test', channelId: channel.id});
        });
        cy.get('.SidebarChannel.unread:contains(Off-Topic)').should('be.visible');
        cy.get('.SidebarChannel:not(.unread):contains(Town Square)').should('be.visible');
    });
    it('should remove channel from sidebar after leaving it', () => {
        const teamName = `team-${getRandomId()}`;
        cy.createNewTeam(teamName, teamName);
        cy.uiGetLHSHeader().findByText(teamName);
        cy.visit(`/${teamName}/channels/off-topic`);
        cy.get('#channelHeaderTitle', {timeout: TIMEOUTS.HALF_MIN}).should('be.visible').should('contain', 'Off-Topic');
        cy.get('#channelHeaderTitle').click();
        cy.get('#channelLeaveChannel').should('be.visible').click();
        verifyChannelSwitch('Town Square', `/${teamName}/channels/town-square`);
        cy.get('.SidebarChannel:contains(Off-Topic)').should('not.exist');
    });
    it('MM-T1684 should remove channel from sidebar after deleting it and navigate away', () => {
        const teamName = `team-${getRandomId()}`;
        cy.createNewTeam(teamName, teamName);
        cy.uiGetLHSHeader().findByText(teamName);
        cy.visit(`/${teamName}/channels/off-topic`);
        cy.get('#channelHeaderTitle', {timeout: TIMEOUTS.HALF_MIN}).should('be.visible').should('contain', 'Off-Topic');
        cy.get('#channelHeaderTitle').click();
        cy.get('#channelArchiveChannel').should('be.visible').click();
        cy.get('#deleteChannelModalDeleteButton').should('be.visible').click();
        cy.url().should('include', `/${teamName}/channels/off-topic`);
        cy.contains('You are viewing an archived channel').should('be.visible');
        cy.get('.SidebarChannel:contains(Off-Topic)').should('exist');
        cy.visit(`/${teamName}/channels/town-square`);
        cy.get('.SidebarChannel:contains(Off-Topic)').should('not.exist');
    });
    it('MM-T3351 Channels created from another instance should immediately appear in the sidebar', () => {
        cy.visit(`/${testTeam.name}/channels/town-square`);
        cy.uiGetLHSHeader().findByText(testTeam.display_name);
        cy.apiCreateChannel(testTeam.id, `channel-${getRandomId()}`, 'New Test Channel').then(({channel}) => {
            cy.apiAddUserToChannel(channel.id, testUser.id).then(() => {
                cy.get(`#sidebarItem_${channel.name}`).should('be.visible');
            });
        });
    });
});