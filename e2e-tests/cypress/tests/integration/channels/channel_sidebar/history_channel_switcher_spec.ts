import * as TIMEOUTS from '../../../fixtures/timeouts';
import {getRandomId} from '../../../utils';
describe('Channel sidebar', () => {
    before(() => {
        cy.apiInitSetup({loginAfter: true}).then(({team}) => {
            cy.visit(`/${team.name}/channels/town-square`);
        });
    });
    it('should not show history arrows on the regular webapp', () => {
        const teamName = `team-${getRandomId()}`;
        cy.createNewTeam(teamName, teamName);
        cy.uiGetLHSHeader().findByText(teamName);
        cy.get('.SidebarChannelNavigator_backButton').should('not.exist');
        cy.get('.SidebarChannelNavigator_forwardButton').should('not.exist');
    });
    it('should switch to channel when using the channel switcher', () => {
        const teamName = `team-${getRandomId()}`;
        cy.createNewTeam(teamName, teamName);
        cy.uiGetLHSHeader().findByText(teamName);
        cy.get('.SidebarChannelNavigator_jumpToButton').should('be.visible').click();
        cy.get('.channel-switcher__suggestion-box #quickSwitchInput').click().type('Off-Topic');
        cy.wait(TIMEOUTS.ONE_HUNDRED_MILLIS);
        cy.get('.channel-switcher__suggestion-box #suggestionList').should('be.visible');
        cy.get('.channel-switcher__suggestion-box .suggestion-list__item').its('length').should('eq', 3);
        cy.get('.channel-switcher__suggestion-box .suggestion-list__item').contains(teamName).click();
        cy.get('.channel-switch__modal').should('not.exist');
        cy.url().should('include', `/${teamName}/channels/off-topic`);
        cy.get('#channelHeaderTitle').should('contain', 'Off-Topic');
        cy.get('.SidebarChannel.active:contains(Off-Topic)').should('be.visible');
    });
});