import * as TIMEOUTS from '../../../fixtures/timeouts';
describe('Channel sidebar', () => {
    const SpaceKeyCode = 32;
    const DownArrowKeyCode = 40;
    let teamName;
    let channelName;
    before(() => {
        cy.apiCreateCustomAdmin({loginAfter: true});
    });
    beforeEach(() => {
        cy.apiCreateTeam('team', 'Team').then(({team}) => {
            teamName = team.display_name;
            cy.apiCreateChannel(team.id, 'channel', 'Channel').then(({channel}) => {
                channelName = channel.display_name;
            });
            cy.visit(`/${team.name}/channels/town-square`);
        });
    });
    it('should move channel to correct place when dragging channel within category', () => {
        cy.uiGetLHSHeader().findByText(teamName);
        cy.uiGetLhsSection('CHANNELS').within(() => {
            cy.get('.SidebarChannel > .SidebarLink').should('be.visible').as('fromChannelSidebarLink');
            cy.get('@fromChannelSidebarLink').eq(0).should('contain', channelName);
            cy.get('@fromChannelSidebarLink').eq(1).should('contain', 'Off-Topic');
            cy.get('@fromChannelSidebarLink').eq(2).should('contain', 'Town Square');
        });
        cy.get('.SidebarChannel:contains(Off-Topic) > .SidebarLink').
            trigger('keydown', {keyCode: SpaceKeyCode}).
            trigger('keydown', {keyCode: DownArrowKeyCode, force: true}).wait(TIMEOUTS.THREE_SEC).
            trigger('keydown', {keyCode: SpaceKeyCode, force: true}).wait(TIMEOUTS.THREE_SEC);
        cy.uiGetLhsSection('CHANNELS').within(() => {
            cy.get('.SidebarChannel > .SidebarLink').as('toChannelSidebarLink');
            cy.get('@toChannelSidebarLink').eq(0).should('contain', channelName);
            cy.get('@toChannelSidebarLink').eq(1).should('contain', 'Town Square');
            cy.get('@toChannelSidebarLink').eq(2).should('contain', 'Off-Topic');
        });
    });
    it('should move category to correct place', () => {
        cy.uiGetLHSHeader().findByText(teamName);
        cy.get('.SidebarChannelGroupHeader_groupButton > div[data-rbd-drag-handle-draggable-id]').should('be.visible').as('fromChannelGroup');
        cy.get('@fromChannelGroup').should('contain', 'CHANNELS');
        cy.get('@fromChannelGroup').eq(0).should('contain', 'CHANNELS');
        cy.get('@fromChannelGroup').eq(1).should('contain', 'DIRECT MESSAGES');
        cy.get('@fromChannelGroup').eq(0).should('contain', 'CHANNELS').
            trigger('keydown', {keyCode: SpaceKeyCode}).
            trigger('keydown', {keyCode: DownArrowKeyCode, force: true}).wait(TIMEOUTS.THREE_SEC).
            trigger('keydown', {keyCode: SpaceKeyCode, force: true}).wait(TIMEOUTS.THREE_SEC);
        cy.get('.SidebarChannelGroupHeader_groupButton > div[data-rbd-drag-handle-draggable-id]').as('toChannelGroup');
        cy.get('@toChannelGroup').eq(1).should('contain', 'CHANNELS');
        cy.get('@toChannelGroup').eq(0).should('contain', 'DIRECT MESSAGES');
    });
    it('should retain focus within the channel sidebar after dragging and dropping with the keyboard', () => {
        cy.uiGetLHSHeader().findByText(teamName);
        cy.get('.SidebarChannel:contains(Off-Topic) > .SidebarLink').
            click().
            focus().
            trigger('keydown', {key: ' ', keyCode: SpaceKeyCode}).
            trigger('keydown', {keyCode: DownArrowKeyCode, force: true}).
            wait(TIMEOUTS.THREE_SEC).
            trigger('keydown', {key: ' ', keyCode: SpaceKeyCode, force: true}).wait(TIMEOUTS.THREE_SEC);
        cy.focused().should('contain', 'Off-Topic');
    });
});