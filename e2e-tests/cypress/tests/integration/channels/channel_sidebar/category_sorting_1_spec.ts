import * as TIMEOUTS from '../../../fixtures/timeouts';
import {getRandomId} from '../../../utils';
import {clickSortCategoryMenuItem} from './helpers';
let testTeam;
let testUser;
describe('Category sorting', () => {
    beforeEach(() => {
        cy.apiAdminLogin();
        cy.apiInitSetup({loginAfter: true}).then(({team, user}) => {
            testTeam = team;
            testUser = user;
            cy.visit(`/${team.name}/channels/town-square`);
        });
    });
    it('MM-T3834 Category sorting -- KNOWN ISSUE: MM-43576', () => {
        const channelNames = [];
        const categoryName = createCategoryFromSidebarMenu();
        for (let i = 0; i < 5; i++) {
            channelNames.push(createChannelAndAddToCategory(categoryName));
            cy.get('#SidebarContainer .simplebar-content-wrapper').scrollTo('bottom', {ensureScrollable: false});
        }
        clickSortCategoryMenuItem(categoryName, 'Alphabetically');
        verifyAlphabeticalSortingOrder(categoryName, channelNames.length);
        channelNames.push(createChannelAndAddToCategory(categoryName));
        cy.get('#SidebarContainer .simplebar-content-wrapper').scrollTo('bottom', {ensureScrollable: false});
        verifyAlphabeticalSortingOrder(categoryName, channelNames.length);
        clickSortCategoryMenuItem(categoryName, 'Recent activity');
        let sortedByRecencyChannelNames = channelNames.concat().reverse();
        for (let i = 0; i < channelNames.length; i++) {
            cy.get(`.SidebarChannelGroup:contains(${categoryName}) .NavGroupContent li:nth-child(${i + 1}) a[id^="sidebarItem_${sortedByRecencyChannelNames[i]}"]`).should('be.visible');
        }
        channelNames.push(createChannelAndAddToCategory(categoryName));
        cy.get('#SidebarContainer .simplebar-content').scrollTo('bottom', {ensureScrollable: false});
        sortedByRecencyChannelNames = channelNames.concat().reverse();
        for (let i = 0; i < channelNames.length; i++) {
            cy.get(`.SidebarChannelGroup:contains(${categoryName}) .NavGroupContent li:nth-child(${i + 1}) a[id^="sidebarItem_${sortedByRecencyChannelNames[i]}"]`).should('be.visible');
        }
        cy.get(`.SidebarChannelGroup:contains(${categoryName}) .NavGroupContent a[id^="sidebarItem_${channelNames[0]}"]`).should('be.visible').within(() => {
            cy.get('.SidebarMenu').invoke('show').get('.SidebarMenu_menuButton').should('be.visible').click({force: true});
        });
        cy.findAllByRole('menu', {name: 'Edit channel menu'}).should('be.visible').within(() => {
            cy.findByText('Move to...').should('be.visible').trigger('mouseover');
        });
        cy.findAllByRole('menu', {name: 'Move to submenu'}).should('be.visible').within(() => {
            cy.findByText('Favorites').should('be.visible').click({force: true});
        });
        cy.get(`.SidebarChannelGroup:contains(FAVORITES) .NavGroupContent a[id^="sidebarItem_${channelNames[0]}"]`).should('be.visible');
        channelNames.shift();
        clickSortCategoryMenuItem(categoryName, 'Manually');
        channelNames.push(createChannelAndAddToCategory(categoryName));
        cy.get('#SidebarContainer .simplebar-content').scrollTo('bottom', {ensureScrollable: false});
        cy.get(`.SidebarChannelGroup:contains(${categoryName}) .NavGroupContent li:nth-child(1) a[id^="sidebarItem_${channelNames[channelNames.length - 1]}"]`).should('be.visible');
    });
});
function createChannelAndAddToCategory(categoryName) {
    const channelName = `channel-${getRandomId()}`;
    const userId = testUser.id;
    cy.apiCreateChannel(testTeam.id, channelName, 'New Test Channel').then(({channel}) => {
        cy.apiAddUserToChannel(channel.id, userId).then(() => {
            cy.uiMoveChannelToCategory(channel.display_name, categoryName);
        });
    });
    return channelName;
}
function verifyAlphabeticalSortingOrder(categoryName, length) {
    const sortedAlphabeticalChannelNames = [];
    for (let i = 0; i < length; i++) {
        cy.get(`.SidebarChannelGroup:contains(${categoryName}) .NavGroupContent li:nth-child(${i + 1}) .SidebarChannelLinkLabel`).should('be.visible').invoke('text').then((text) => {
            sortedAlphabeticalChannelNames.push(text);
            const comparedSortedChannelNames = sortedAlphabeticalChannelNames.concat().sort((a, b) => a.localeCompare(b, 'en', {numeric: true}));
            assert.deepEqual(sortedAlphabeticalChannelNames, comparedSortedChannelNames);
        });
    }
}
function createCategoryFromSidebarMenu() {
    const categoryName = `category-${getRandomId()}`;
    cy.uiBrowseOrCreateChannel('Create new category');
    cy.get('#editCategoryModal').should('be.visible').wait(TIMEOUTS.HALF_SEC).within(() => {
        cy.findByText('Create New Category').should('be.visible');
        cy.findByPlaceholderText('Name your category').should('be.visible').type(categoryName).type('{enter}');
    });
    return categoryName;
}