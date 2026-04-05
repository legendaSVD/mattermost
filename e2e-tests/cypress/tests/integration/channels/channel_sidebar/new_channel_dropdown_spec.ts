import * as TIMEOUTS from '../../../fixtures/timeouts';
import {getRandomId} from '../../../utils';
describe('Channel sidebar', () => {
    before(() => {
        cy.apiInitSetup({loginAfter: true}).then(({team}) => {
            cy.visit(`/${team.name}/channels/town-square`);
        });
    });
    it('should create a new channel when using the new channel dropdown', () => {
        const teamName = `team-${getRandomId()}`;
        cy.createNewTeam(teamName, teamName);
        cy.uiGetLHSHeader().findByText(teamName);
        const channelName = 'Test Channel';
        cy.uiCreateChannel({name: channelName}).then(() => {
            cy.url().should('include', `/${teamName}/channels/test-channel`);
            cy.get('#channelHeaderTitle').should('contain', channelName);
            cy.get(`.SidebarChannel.active:contains(${channelName})`).should('be.visible');
        });
    });
    it('should join a new public channel when using the new channel dropdown', () => {
        const teamName = `team-${getRandomId()}`;
        cy.createNewTeam(teamName, teamName);
        cy.uiGetLHSHeader().findByText(teamName);
        cy.visit(`/${teamName}/channels/off-topic`);
        cy.get('#channelHeaderTitle', {timeout: TIMEOUTS.HALF_MIN}).should('contain', 'Off-Topic');
        cy.get('#channelHeaderTitle').click();
        cy.get('#channelLeaveChannel').click();
        cy.get('#channelHeaderTitle').should('contain', 'Town Square');
        cy.url().should('include', `/${teamName}/channels/town-square`);
        cy.uiBrowseOrCreateChannel('Browse channels');
        cy.get('#browseChannelsModal').should('be.visible');
        cy.findByText('Off-Topic').should('be.visible').click();
        cy.get('#browseChannelsModal').should('exist');
        cy.url().should('include', `/${teamName}/channels/off-topic`);
        cy.get('#channelHeaderTitle').should('contain', 'Off-Topic');
        cy.get('.SidebarChannel.active:contains(Off-Topic)').should('be.visible');
    });
});