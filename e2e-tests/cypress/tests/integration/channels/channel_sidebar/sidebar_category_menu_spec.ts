import * as TIMEOUTS from '../../../fixtures/timeouts';
import {clickCategoryMenuItem} from './helpers';
describe('Sidebar category menu', () => {
    before(() => {
        cy.apiInitSetup({loginAfter: true}).then(({team}) => {
            cy.visit(`/${team.name}/channels/town-square`);
        });
    });
    it('MM-T3171_1 Verify that the 3-dot menu on the Channels Category contains an option to Create New Category', () => {
        clickCategoryMenuItem({categoryDisplayName: 'CHANNELS', menuItemText: 'Create New Category', categoryMenuButtonName: 'Channels'});
        cy.wait(TIMEOUTS.ONE_SEC);
        cy.get('body').type('{esc}', {force: true});
    });
    it('MM-T3171_2 Verify that the 3-dot menu on the Favourites Category contains an option to Create New Category, and that the Create New Category modal shows', () => {
        cy.contains('.SidebarChannelGroup', 'CHANNELS').as('channelsCategory');
        cy.get('@channelsCategory').find('#sidebarItem_town-square');
        cy.uiGetChannelSidebarMenu('Town Square').within(() => {
            cy.findByText('Favorite').click();
        });
        cy.contains('.SidebarChannelGroup', 'FAVORITES').find('#sidebarItem_town-square');
        clickCategoryMenuItem({categoryDisplayName: 'FAVORITES', menuItemText: 'Create New Category', categoryMenuButtonName: 'Favorites'});
        cy.wait(TIMEOUTS.ONE_SEC);
        cy.get('body').type('{esc}', {force: true});
    });
});