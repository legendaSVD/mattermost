import * as TIMEOUTS from '../../../fixtures/timeouts';
import * as MESSAGES from '../../../fixtures/messages';
import {getAdminAccount} from '../../../support/env';
describe('Channel sidebar', () => {
    const sysadmin = getAdminAccount();
    let testTeam;
    beforeEach(() => {
        cy.apiAdminLogin();
        cy.apiInitSetup({loginAfter: true}).then(({team, townSquareUrl}) => {
            testTeam = team;
            cy.visit(townSquareUrl);
        });
    });
    it('should display collapsed state when collapsed', () => {
        cy.get('.SidebarChannelGroupHeader:contains(CHANNELS)').should('be.visible').as('channelsGroup');
        cy.get('@channelsGroup').find('i').should('not.have.class', 'icon-rotate-minus-90');
        cy.get('@channelsGroup').click();
        cy.get('@channelsGroup').find('i').should('have.class', 'icon-rotate-minus-90');
    });
    it('should collapse channels that are not the currently viewed channel', () => {
        cy.get('.SidebarChannelGroupHeader:contains(CHANNELS)').should('be.visible').as('channelsGroup');
        cy.get('.SidebarChannelGroup').should('be.visible').as('sidebarChannelGroup');
        cy.get('@sidebarChannelGroup').findByText('Town Square').should('exist').and('be.visible');
        cy.get('@sidebarChannelGroup').findByText('Off-Topic').should('be.visible');
        cy.get('@channelsGroup').click();
        cy.get('.SidebarChannelGroup').should('be.visible').as('sidebarChannelGroup');
        cy.get('@sidebarChannelGroup').findByText('Town Square').should('be.visible');
        cy.get('@sidebarChannelGroup').findByText('Off-Topic').should('not.exist');
    });
    it('should collapse channels that are not unread channels', () => {
        const uniqueChannelName = MESSAGES.TINY;
        cy.apiCreateChannel(testTeam.id, 'channel-test', uniqueChannelName, 'O', '', '', false).then(({channel}) => {
            cy.postMessageAs({sender: sysadmin, message: MESSAGES.SMALL, channelId: channel.id});
            cy.reload();
            cy.uiGetPostTextBox();
            cy.get('.SidebarChannelGroupHeader:contains(CHANNELS)').should('be.visible').as('channelsGroup');
            cy.get('.SidebarChannelGroup').should('be.visible').as('sidebarChannelGroup');
            cy.get('.SidebarChannelGroup').findByText('Off-Topic').should('exist').and('be.visible');
            cy.get('.SidebarChannelGroup').findByText(uniqueChannelName).should('exist').and('be.visible');
            cy.get('@channelsGroup').click();
            cy.get('.SidebarChannelGroup').should('be.visible').as('sidebarChannelGroup');
            cy.get('@sidebarChannelGroup').findByText('Off-Topic').should('not.exist');
            cy.get('@sidebarChannelGroup').findByText(uniqueChannelName).should('be.visible');
        });
    });
    it('should save collapsed state and remember the state on refresh', () => {
        cy.get('.SidebarChannelGroupHeader:contains(CHANNELS)').should('be.visible');
        cy.get('.SidebarChannelGroupHeader:contains(CHANNELS) i').should('be.visible').should('not.have.class', 'icon-rotate-minus-90');
        cy.get('.SidebarChannelGroupHeader:contains(CHANNELS)').should('be.visible').click();
        cy.get('.SidebarChannelGroupHeader:contains(CHANNELS) i').should('have.class', 'icon-rotate-minus-90');
        cy.wait(TIMEOUTS.FIVE_SEC);
        cy.reload();
        cy.uiGetPostTextBox();
        cy.get('.SidebarChannelGroupHeader:contains(CHANNELS) i').should('have.class', 'icon-rotate-minus-90');
        cy.get('.SidebarChannelGroupHeader:contains(CHANNELS)').click();
        cy.get('.SidebarChannelGroupHeader:contains(CHANNELS) i').should('not.have.class', 'icon-rotate-minus-90');
        cy.wait(TIMEOUTS.FIVE_SEC);
        cy.reload();
        cy.uiGetPostTextBox();
        cy.get('.SidebarChannelGroupHeader:contains(CHANNELS) i').should('not.have.class', 'icon-rotate-minus-90');
    });
    it('should retain the collapsed state of categories when unread filter is enabled/disabled', () => {
        cy.apiCreateChannel(testTeam.id, 'channel-test', 'Channel Test').then(({channel}) => {
            cy.postMessageAs({sender: sysadmin, message: 'Test', channelId: channel.id});
            cy.get('.SidebarChannelGroupHeader:contains(CHANNELS) i').should('not.have.class', 'icon-rotate-minus-90');
            cy.get('.SidebarChannelGroupHeader:contains(CHANNELS)').should('be.visible');
            cy.get('.SidebarChannelGroupHeader:contains(CHANNELS) i').should('be.visible').should('not.have.class', 'icon-rotate-minus-90');
            cy.get('.SidebarChannelGroupHeader:contains(DIRECT MESSAGES)').should('be.visible');
            cy.get('.SidebarChannelGroupHeader:contains(DIRECT MESSAGES) i').should('be.visible').should('not.have.class', 'icon-rotate-minus-90');
            cy.get('.SidebarChannelGroupHeader:contains(CHANNELS)').click();
            cy.get('.SidebarChannelGroupHeader:contains(CHANNELS) i').should('have.class', 'icon-rotate-minus-90');
            cy.get('.SidebarFilters_filterButton').click();
            cy.get('.SidebarChannelGroupHeader:contains(UNREADS)').should('be.visible');
            cy.get('.SidebarFilters_filterButton').click();
            cy.get('.SidebarChannelGroupHeader:contains(CHANNELS) i').should('be.visible').should('have.class', 'icon-rotate-minus-90');
            cy.get('.SidebarChannelGroupHeader:contains(DIRECT MESSAGES) i').should('be.visible').should('not.have.class', 'icon-rotate-minus-90');
        });
    });
});