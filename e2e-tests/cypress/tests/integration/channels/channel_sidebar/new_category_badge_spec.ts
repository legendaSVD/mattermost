import {getRandomId} from '../../../utils';
describe('New category badge', () => {
    before(() => {
        cy.apiInitSetup({loginAfter: true}).then(({team}) => {
            cy.visit(`/${team.name}/channels/town-square`);
        });
    });
    it('MM-T3312 should show the new badge until a channel is added to the category', () => {
        const categoryName = `new-${getRandomId()}`;
        cy.uiCreateSidebarCategory(categoryName).as('newCategory');
        cy.contains('.SidebarChannelGroup', categoryName, {matchCase: false}).within(() => {
            cy.get('.SidebarCategory_newLabel').should('be.visible');
            cy.get('.SidebarCategory_newDropBox').should('be.visible');
        });
        cy.uiMoveChannelToCategory('Town Square', categoryName);
        cy.contains('.SidebarChannelGroup', categoryName, {matchCase: false}).within(() => {
            cy.get('.SidebarCategory_newLabel').should('not.exist');
            cy.get('.SidebarCategory_newDropBox').should('not.exist');
        });
        cy.uiMoveChannelToCategory('Town Square', 'Channels');
        cy.contains('.SidebarChannelGroup', categoryName, {matchCase: false}).within(() => {
            cy.get('#sidebarItem_town-square').should('not.exist');
            cy.get('.SidebarCategory_newLabel').should('not.exist');
            cy.get('.SidebarCategory_newDropBox').should('not.exist');
        });
    });
});