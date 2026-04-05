import {
    beMuted,
    beRead,
    beUnread,
} from '../../../support/assertions';
import {getAdminAccount} from '../../../support/env';
import * as TIMEOUTS from '../../../fixtures/timeouts';
import {getRandomId} from '../../../utils';
describe('Channel sidebar unread filter', () => {
    const randomId = getRandomId();
    let testUser;
    let teamId;
    before(() => {
        cy.apiUpdateConfig({
            ServiceSettings: {
                ThreadAutoFollow: true,
                CollapsedThreads: 'default_off',
            },
        });
        cy.apiInitSetup({loginAfter: true}).then(({user, team}) => {
            testUser = user;
            teamId = team.id;
            cy.visit('/');
        });
    });
    it('MM-T3441 should change the filter label when the unread filter changes state', () => {
        cy.findByRole('application', {name: 'channel sidebar region'}).within(() => {
            cy.findAllByText('UNREADS').should('not.exist');
            cy.findAllByRole('button', {name: 'CHANNELS'}).should('be.visible');
            cy.findAllByRole('button', {name: 'DIRECT MESSAGES'}).should('be.visible');
        });
        enableUnreadFilter();
        cy.findByRole('application', {name: 'channel sidebar region'}).within(() => {
            cy.findAllByText('UNREADS').should('be.visible');
            cy.findAllByRole('button', {name: 'CHANNELS'}).should('not.exist');
            cy.findAllByRole('button', {name: 'DIRECT MESSAGES'}).should('not.exist');
        });
        disableUnreadFilter();
        cy.findByRole('application', {name: 'channel sidebar region'}).within(() => {
            cy.findAllByText('UNREADS').should('not.exist');
            cy.findAllByRole('button', {name: 'CHANNELS'}).should('be.visible');
            cy.findAllByRole('button', {name: 'DIRECT MESSAGES'}).should('be.visible');
        });
    });
    it('MM-T3442 should not persist the state of the unread filter on reload', () => {
        cy.get('.SidebarChannelGroupHeader:contains(CHANNELS)').should('be.visible');
        cy.get('.SidebarChannelGroupHeader:contains(DIRECT MESSAGES)').should('be.visible');
        enableUnreadFilter();
        cy.reload();
        cy.get('.SidebarChannelGroupHeader:contains(CHANNELS)').should('be.visible');
        cy.get('.SidebarChannelGroupHeader:contains(DIRECT MESSAGES)').should('be.visible');
    });
    it('MM-T3443 should only show unread channels with filter enabled', () => {
        cy.get('.SidebarChannelGroupHeader:contains(CHANNELS)').should('be.visible');
        const readChannelName = `read${randomId}`;
        const unreadChannelName = `unread${randomId}`;
        createChannel(teamId, readChannelName);
        createChannel(teamId, unreadChannelName, 'test');
        cy.get(`#sidebarItem_${readChannelName}`).should(beRead);
        cy.get(`#sidebarItem_${unreadChannelName}`).should(beUnread);
        enableUnreadFilter();
        cy.get(`#sidebarItem_${readChannelName}`).should('not.exist');
        cy.get(`#sidebarItem_${unreadChannelName}`).should('be.visible').should(beUnread);
        disableUnreadFilter();
        cy.get(`#sidebarItem_${readChannelName}`).should('be.visible').should(beRead);
    });
    it('MM-T3444 should always show the current channel, even if it is not unread', () => {
        cy.get('.SidebarChannelGroupHeader:contains(CHANNELS)').should('be.visible');
        cy.get('#sidebarItem_town-square').click();
        cy.get('#channelHeaderTitle').should('contain', 'Town Square');
        cy.get('#sidebarItem_town-square').should('be.visible').should(beRead);
        enableUnreadFilter();
        cy.get('#sidebarItem_town-square').should('be.visible').should(beRead);
        disableUnreadFilter();
    });
    it('MM-T3445 should hide channels once they have been read', () => {
        cy.get('.SidebarChannelGroupHeader:contains(CHANNELS)').should('be.visible');
        const channelName1 = `channel1${randomId}`;
        const channelName2 = `channel2${randomId}`;
        createChannel(teamId, channelName1, 'test');
        createChannel(teamId, channelName2, 'test');
        enableUnreadFilter();
        cy.get(`#sidebarItem_${channelName1}`).should('be.visible').should(beUnread);
        cy.get(`#sidebarItem_${channelName2}`).should('be.visible').should(beUnread);
        cy.get(`#sidebarItem_${channelName1}`).click();
        cy.get(`#sidebarItem_${channelName1}`).should('be.visible').should(beRead);
        cy.get(`#sidebarItem_${channelName2}`).should('be.visible').should(beUnread);
        cy.get(`#sidebarItem_${channelName2}`).click();
        cy.get(`#sidebarItem_${channelName1}`).should('not.exist');
        cy.get(`#sidebarItem_${channelName2}`).should('be.visible').should(beRead);
        disableUnreadFilter();
    });
    it('MM-T3446 should only show unread channels with filter enabled', () => {
        cy.get('.SidebarChannelGroupHeader:contains(CHANNELS)').should('be.visible');
        const mentionedChannelName = `mentioned${randomId}`;
        const unreadChannelName = `muted${randomId}`;
        [mentionedChannelName, unreadChannelName].forEach((channelName, index) => {
            createChannel(teamId, channelName).then(({channel}) => {
                cy.uiGetChannelSidebarMenu(channel.display_name).within(() => {
                    cy.findByText('Mute Channel').should('be.visible').click();
                });
                cy.get('#sidebarItem_town-square').click({force: true});
                cy.postMessageAs({
                    sender: getAdminAccount(),
                    message: index === 0 ? `@${testUser.username}` : 'test',
                    channelId: channel.id,
                });
            });
        });
        cy.get(`#sidebarItem_${mentionedChannelName}`).should(beUnread).should(beMuted);
        cy.get(`#sidebarItem_${mentionedChannelName} .badge`).should('be.visible');
        cy.get(`#sidebarItem_${unreadChannelName}`).should(beRead).should(beMuted);
        cy.get(`#sidebarItem_${unreadChannelName} .badge`).should('not.exist');
        enableUnreadFilter();
        cy.get(`#sidebarItem_${mentionedChannelName}`).should('be.visible');
        cy.get(`#sidebarItem_${unreadChannelName}`).should('not.exist');
        disableUnreadFilter();
        cy.get(`#sidebarItem_${unreadChannelName}`).should('be.visible');
    });
    it('MM-T5192 should toggle between unreads and all channels with shortcut usage', () => {
        cy.get('.SidebarChannelGroupHeader:contains(CHANNELS)').should('be.visible');
        const readChannelName = `shortcutread${randomId}`;
        const unreadChannelName = `shortcutunread${randomId}`;
        createChannel(teamId, readChannelName);
        createChannel(teamId, unreadChannelName, 'test');
        cy.get(`#sidebarItem_${readChannelName}`).should(beRead);
        cy.get(`#sidebarItem_${unreadChannelName}`).should(beUnread);
        enableUnreadFilterWithShortcut();
        cy.get(`#sidebarItem_${readChannelName}`).should('not.exist');
        cy.get(`#sidebarItem_${unreadChannelName}`).should('be.visible').should(beUnread);
        disableUnreadFilterWithShortcut();
        cy.get(`#sidebarItem_${readChannelName}`).should('be.visible').should(beRead);
    });
    it('MM-T5208 continue to show global Threads item when unread filter is enabled', () => {
        cy.get('.SidebarChannelGroupHeader:contains(UNREADS)').should('not.exist');
        cy.findByRole('application', {name: 'channel sidebar region'}).within(() => {
            cy.findAllByText('UNREADS').should('not.exist');
            cy.findAllByRole('button', {name: 'CHANNELS'}).should('be.visible');
            cy.findAllByRole('button', {name: 'DIRECT MESSAGES'}).should('be.visible');
        });
        cy.apiSaveCRTPreference(testUser.id, 'on');
        cy.get('.SidebarGlobalThreads').should('exist');
        cy.get('#threads-list-unread-button .dot').should('not.exist');
        const readChannelName = `globalthreadread${randomId}`;
        const unreadChannelName = `globalthreadunread${randomId}`;
        createChannel(teamId, readChannelName);
        createChannel(teamId, unreadChannelName, 'test in unread channel');
        cy.get(`#sidebarItem_${readChannelName}`).should(beRead);
        cy.get(`#sidebarItem_${unreadChannelName}`).should(beUnread);
        enableUnreadFilter();
        cy.findByRole('application', {name: 'channel sidebar region'}).within(() => {
            cy.findAllByText('UNREADS').should('be.visible');
            cy.findAllByRole('button', {name: 'CHANNELS'}).should('not.exist');
            cy.findAllByRole('button', {name: 'DIRECT MESSAGES'}).should('not.exist');
        });
        cy.get(`#sidebarItem_${readChannelName}`).should('not.exist');
        cy.get(`#sidebarItem_${unreadChannelName}`).should('be.visible').should(beUnread);
        cy.get('.SidebarGlobalThreads').should('exist');
        disableUnreadFilter();
        cy.get(`#sidebarItem_${readChannelName}`).should('be.visible').should(beRead);
        cy.findByRole('application', {name: 'channel sidebar region'}).within(() => {
            cy.findAllByText('UNREADS').should('not.exist');
            cy.findAllByRole('button', {name: 'CHANNELS'}).should('be.visible');
            cy.findAllByRole('button', {name: 'DIRECT MESSAGES'}).should('be.visible');
        });
    });
});
function enableUnreadFilter() {
    cy.get('.SidebarFilters_filterButton').click();
    cy.get('.SidebarChannelGroupHeader:contains(UNREADS)').should('be.visible');
}
function disableUnreadFilter() {
    cy.get('.SidebarFilters_filterButton').click();
    cy.get('.SidebarChannelGroupHeader:contains(UNREADS)').should('not.exist');
}
function enableUnreadFilterWithShortcut() {
    cy.get('body').cmdOrCtrlShortcut('{shift}U');
    cy.get('.SidebarChannelGroupHeader:contains(UNREADS)').should('be.visible');
}
function disableUnreadFilterWithShortcut() {
    cy.get('body').cmdOrCtrlShortcut('{shift}U');
    cy.get('.SidebarChannelGroupHeader:contains(UNREADS)').should('not.exist');
}
function createChannel(teamId, channelName, message?) {
    return cy.apiCreateChannel(teamId, channelName, channelName, 'O', '', '', false).then(({channel}) => {
        if (message) {
            cy.wait(TIMEOUTS.THREE_SEC);
            cy.postMessageAs({sender: getAdminAccount(), message, channelId: channel.id});
        }
        return cy.wrap({channel});
    });
}