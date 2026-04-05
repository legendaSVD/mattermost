import {
    beMuted,
    beRead,
    beUnmuted,
    beUnread,
} from '../../../support/assertions';
import {getAdminAccount} from '../../../support/env';
import {getRandomId, stubClipboard} from '../../../utils';
describe('Sidebar channel menu', () => {
    const sysadmin = getAdminAccount();
    const townSquare = 'Town Square';
    let teamName;
    let userName;
    before(() => {
        cy.apiInitSetup({loginAfter: true}).then(({team, user}) => {
            teamName = team.name;
            userName = user.username;
            cy.visit(`/${team.name}/channels/town-square`);
        });
    });
    it('MM-T3349_1 should be able to mark a channel as read', () => {
        cy.uiGetLHS().within(() => {
            cy.findByText(townSquare).should('be.visible');
        });
        cy.get('#channelHeaderTitle').should('contain', townSquare);
        cy.getCurrentChannelId().as('townSquareId');
        cy.get('#sidebarItem_off-topic').click();
        cy.get('#channelHeaderTitle').should('contain', 'Off-Topic');
        cy.get('@townSquareId').then((townSquareId) => {
            cy.postMessageAs({
                sender: sysadmin,
                message: 'post1',
                channelId: `${townSquareId}`,
            });
        });
        cy.get('#sidebarItem_town-square').should(beUnread);
        cy.uiGetChannelSidebarMenu(townSquare).within(() => {
            cy.findByText('Mark as Read').click();
        });
        cy.get('#sidebarItem_town-square').should(beRead);
    });
    it('MM-T3349_2 should be able to favorite/unfavorite a channel', () => {
        cy.uiGetLhsSection('CHANNELS').findByText(townSquare).should('be.visible');
        cy.uiGetChannelSidebarMenu(townSquare).within(() => {
            cy.findByText('Favorite').click();
        });
        cy.uiGetLhsSection('FAVORITES').findByText(townSquare).should('be.visible');
        cy.uiGetChannelSidebarMenu(townSquare).within(() => {
            cy.findByText('Unfavorite').click();
        });
        cy.uiGetLhsSection('CHANNELS').findByText(townSquare).should('be.visible');
    });
    it('MM-T3349_3 should be able to mute/unmute a channel', () => {
        cy.get('#sidebarItem_town-square').should(beUnmuted);
        cy.uiGetChannelSidebarMenu(townSquare).within(() => {
            cy.findByText('Mute Channel').click();
        });
        cy.get('#sidebarItem_town-square').should(beMuted);
        cy.uiGetChannelSidebarMenu(townSquare).within(() => {
            cy.findByText('Unmute Channel').click();
        });
        cy.get('#sidebarItem_town-square').should(beUnmuted);
    });
    it('MM-T3349_4 should be able to move channels between categories', () => {
        const categoryName = `new-${getRandomId()}`;
        cy.uiGetLhsSection('CHANNELS').findByText(townSquare).should('be.visible');
        cy.uiMoveChannelToCategory(townSquare, categoryName, true);
        cy.uiGetLhsSection(categoryName).findByText(townSquare).should('be.visible');
        cy.uiGetLhsSection('CHANNELS').findByText(townSquare).should('not.exist');
        cy.uiMoveChannelToCategory(townSquare, 'Channels');
        cy.uiGetLhsSection(categoryName).findByText(townSquare).should('not.exist');
        cy.uiGetLhsSection('CHANNELS').findByText(townSquare).should('be.visible');
    });
    it('MM-T3349_5 should be able to copy the channel link', () => {
        stubClipboard().as('clipboard');
        cy.uiGetChannelSidebarMenu(townSquare).within(() => {
            cy.findByText('Copy Link').click();
        });
        cy.get('@clipboard').its('wasCalled').should('eq', true);
        cy.location().then((location) => {
            cy.get('@clipboard').its('contents').should('eq', `${location.origin}/${teamName}/channels/town-square`);
        });
    });
    it('MM-T3349_6 should be able to open the add other users to the channel', () => {
        cy.uiGetChannelSidebarMenu(townSquare).within(() => {
            cy.findByText('Add Members').click();
        });
        cy.get('#addUsersToChannelModal').should('be.visible').findByText('Add people to Town Square');
        cy.uiClose();
    });
    it('MM-T3350 Mention badge should remain hidden as long as the channel/dm/gm menu is open', () => {
        cy.get('#sidebarItem_town-square').click();
        cy.get('#channelHeaderTitle').should('contain', townSquare);
        cy.getCurrentChannelId().as('townSquareId');
        cy.get('#sidebarItem_off-topic').click();
        cy.get('#channelHeaderTitle').should('contain', 'Off-Topic');
        cy.get('@townSquareId').then((townSquareId) => {
            cy.postMessageAs({
                sender: sysadmin,
                message: `@${userName} post1`,
                channelId: `${townSquareId}`,
            });
        });
        cy.get('#sidebarItem_town-square .badge').should('be.visible');
        cy.get('#sidebarItem_town-square').find('.SidebarMenu_menuButton').click({force: true});
        cy.get('#sidebarItem_town-square .badge').should('not.be.visible');
    });
});