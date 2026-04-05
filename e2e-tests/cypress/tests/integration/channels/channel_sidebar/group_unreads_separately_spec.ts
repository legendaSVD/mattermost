import {getAdminAccount} from '../../../support/env';
describe('Channel sidebar - group unreads separately', () => {
    let testTeam;
    let testChannel;
    beforeEach(() => {
        cy.apiAdminLogin().then(() => {
            cy.apiInitSetup({loginAfter: true}).then(({team, channel}) => {
                testTeam = team;
                testChannel = channel;
                cy.visit(`/${team.name}/channels/town-square`);
                enableOrDisableUnreadsCategory();
                cy.postMessageAs({sender: getAdminAccount(), message: 'test message', channelId: testChannel.id});
            });
        });
    });
    it('MM-T3719_1 Unreads category should show only if there is an unread message', () => {
        cy.get('.SidebarChannelGroup:contains(UNREADS)').should('be.visible').within(() => {
            cy.get('.SidebarChannelGroupHeader:contains(UNREADS)').should('be.visible');
            cy.get(`.SidebarChannel.unread:contains(${testChannel.display_name})`).should('be.visible');
        });
        cy.get(`.SidebarChannel.unread .SidebarLink:contains(${testChannel.display_name})`).should('be.visible').click();
        cy.url().should('include', `/${testTeam.name}/channels/${testChannel.name}`);
        cy.get('.SidebarChannelGroup:contains(UNREADS)').should('be.visible').get(`.SidebarChannel:not(.unread):contains(${testChannel.display_name})`).should('be.visible');
        cy.get('.SidebarLink:contains(Town Square)').should('be.visible').click();
        cy.get('.SidebarChannelGroupHeader:contains(UNREADS)').should('not.exist');
        cy.get('.SidebarChannelGroup:contains(CHANNELS)').should('be.visible').get(`.SidebarChannel:contains(${testChannel.display_name})`).should('be.visible');
    });
    it('MM-T3719_2 Unreads category should disappear when the setting is turned off', () => {
        cy.get('.SidebarChannelGroup:contains(UNREADS)').should('be.visible').within(() => {
            cy.get('.SidebarChannelGroupHeader:contains(UNREADS)').should('be.visible');
            cy.get(`.SidebarChannel.unread:contains(${testChannel.display_name})`).should('be.visible');
        });
        enableOrDisableUnreadsCategory(false);
        cy.get('.SidebarChannelGroupHeader:contains(UNREADS)').should('not.exist');
        cy.get('.SidebarChannelGroup:contains(CHANNELS)').should('be.visible').get(`.SidebarChannel.unread:contains(${testChannel.display_name})`).should('be.visible');
    });
    it('MM-T3719_3 Channels marked as unread should appear in the unreads category', () => {
        cy.get(`.SidebarChannel.unread .SidebarLink:contains(${testChannel.display_name})`).should('be.visible').click();
        cy.get('.SidebarLink:contains(Town Square)').should('be.visible').click();
        cy.get('.SidebarChannelGroup:contains(CHANNELS)').should('be.visible').get(`.SidebarChannel:not(.unread):contains(${testChannel.display_name})`).should('be.visible');
        cy.get(`.SidebarChannel:not(.unread) .SidebarLink:contains(${testChannel.display_name})`).should('be.visible').click();
        cy.getLastPostId().then((postId) => {
            cy.uiClickPostDropdownMenu(postId, 'Mark as Unread');
        });
        cy.get('.SidebarChannelGroup:contains(UNREADS)').should('be.visible').get(`.SidebarChannel.unread:contains(${testChannel.display_name})`).should('be.visible');
    });
    it('MM-T3719_4 Read channels should not enter the unreads category', () => {
        cy.get('.SidebarLink:contains(Off-Topic)').should('be.visible').click();
        cy.get('.SidebarChannelGroup:contains(CHANNELS)').should('be.visible').get('.SidebarChannel:not(.unread):contains(Off-Topic)').should('be.visible');
    });
    it('MM-T4655 Leaving an unread channel when unread category is ON', () => {
        cy.get(`.SidebarChannel.unread .SidebarLink:contains(${testChannel.display_name})`).should('be.visible').click();
        cy.getLastPostId().then((postId) => {
            cy.uiClickPostDropdownMenu(postId, 'Mark as Unread');
        });
        cy.get('.SidebarChannelGroup:contains(UNREADS)').should('be.visible').get(`.SidebarChannel.unread:contains(${testChannel.display_name})`).should('be.visible');
        cy.uiLeaveChannel();
        cy.url().should('include', '/channels/town-square');
    });
});
function toggleOnOrOffUnreadsCategory(toggleOn = true) {
    cy.uiOpenSettingsModal('Sidebar');
    cy.get('#showUnreadsCategoryEdit').click();
    if (toggleOn) {
        cy.findByTestId('showUnreadsCategoryOn').click();
    } else {
        cy.findByTestId('showUnreadsCategoryOff').click();
    }
}
function enableOrDisableUnreadsCategory(enable = true) {
    toggleOnOrOffUnreadsCategory(enable);
    cy.uiSave();
    if (enable) {
        cy.get('#showUnreadsCategoryDesc').should('have.text', 'On');
    } else {
        cy.get('#showUnreadsCategoryDesc').should('have.text', 'Off');
    }
    cy.uiClose();
}