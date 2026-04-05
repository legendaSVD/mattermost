import {getRandomId} from '../../../../utils';
describe('Handle removed user - new sidebar', () => {
    it('MM-27202 should add new channels to the sidebar when created from another session', () => {
        const teamName = `team-${getRandomId()}`;
        cy.createNewTeam(teamName, teamName);
        cy.uiGetLHSHeader().findByText(teamName);
        const channelName = `channel-${getRandomId()}`;
        cy.apiGetTeamByName(teamName).then(({team}) => {
            cy.apiCreateChannel(team.id, channelName, channelName, 'O', '', '', false);
        });
        cy.get(`#sidebarItem_${channelName}`).should('be.visible');
    });
});