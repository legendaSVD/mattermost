import * as TIMEOUTS from '../../../fixtures/timeouts';
import {getRandomId} from '../../../utils';
import {clickCategoryMenuItem} from './helpers';
describe('Channel sidebar', () => {
    before(() => {
        cy.apiInitSetup({loginAfter: true}).then(({team}) => {
            cy.visit(`/${team.name}/channels/town-square`);
        });
    });
    it('MM-T3161_1 should create a new category from sidebar menu', () => {
        const categoryName = createCategoryFromSidebarMenu();
        cy.findByLabelText(categoryName).should('be.visible');
    });
    it('MM-T3161_2 should create a new category from category menu', () => {
        const categoryName = createCategoryFromSidebarMenu();
        clickCategoryMenuItem({categoryDisplayName: categoryName, menuItemText: 'Create New Category'});
        const newCategoryName = `category-${getRandomId()}`;
        cy.get('#editCategoryModal input').type(newCategoryName).type('{enter}');
        cy.findByLabelText(newCategoryName).should('be.visible');
    });
    it('MM-T3161_3 move an existing channel to a new category', () => {
        const newCategoryName = `category-${getRandomId()}`;
        cy.uiMoveChannelToCategory('Off-Topic', newCategoryName, true);
        cy.findByLabelText(newCategoryName).should('be.visible');
    });
    it('MM-T3163 Rename a category', () => {
        const categoryName = createCategoryFromSidebarMenu();
        clickCategoryMenuItem({categoryDisplayName: categoryName, menuItemText: 'Rename Category'});
        const renameCategory = `category-${getRandomId()}`;
        cy.get('#editCategoryModal input').clear().type(renameCategory).type('{enter}');
        cy.findByLabelText(categoryName).should('not.exist');
        cy.findByLabelText(renameCategory).should('be.visible');
    });
    it('MM-T3165 Delete a category', () => {
        const categoryName = createCategoryFromSidebarMenu();
        clickCategoryMenuItem({categoryDisplayName: categoryName, menuItemText: 'Delete Category'});
        cy.get('.GenericModal__button.delete').click();
        cy.findByLabelText(categoryName).should('not.exist');
    });
});
function createCategoryFromSidebarMenu() {
    const categoryName = `category-${getRandomId()}`;
    cy.uiBrowseOrCreateChannel('Create new category');
    cy.get('#editCategoryModal').should('be.visible').wait(TIMEOUTS.HALF_SEC).within(() => {
        cy.findByText('Create New Category').should('be.visible');
        cy.findByPlaceholderText('Name your category').should('be.visible').type(categoryName).type('{enter}');
    });
    return categoryName;
}