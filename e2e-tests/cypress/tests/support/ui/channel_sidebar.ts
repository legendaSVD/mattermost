import {ChainableT} from 'tests/types';
import {getRandomId} from '../../utils';
function uiCreateSidebarCategory(categoryName: string = `category-${getRandomId()}`): ChainableT<any> {
    cy.uiBrowseOrCreateChannel('Create new category');
    cy.findByRole('dialog', {name: 'Create New Category'}).should('be.visible').within(() => {
        cy.findByRole('textbox').should('be.visible').typeWithForce(categoryName).
            invoke('val').should('equal', categoryName);
        cy.findByRole('button', {name: 'Create'}).should('be.enabled').click();
    });
    cy.contains('.SidebarChannelGroup', categoryName, {matchCase: false});
    return cy.wrap({displayName: categoryName});
}
Cypress.Commands.add('uiCreateSidebarCategory', uiCreateSidebarCategory);
function uiMoveChannelToCategory(channelName: string, categoryName: string, newCategory = false, isChannelId = false): ChainableT<any> {
    cy.uiGetChannelSidebarMenu(channelName, isChannelId).within(() => {
        cy.findByText('Move to...').should('be.visible').trigger('mouseover');
    });
    cy.findAllByRole('menu', {name: 'Move to submenu'}).should('be.visible').within(() => {
        if (newCategory) {
            cy.findByText('New Category').should('be.visible').click({force: true});
        } else {
            cy.findByText(categoryName).should('be.visible').click({force: true});
        }
    });
    if (newCategory) {
        cy.findByRole('dialog', {name: 'Create New Category'}).should('be.visible').within(() => {
            cy.findByRole('textbox').should('be.visible').typeWithForce(categoryName).
                invoke('val').should('equal', categoryName);
            cy.findByRole('button', {name: 'Create'}).should('be.enabled').click();
        });
    }
    return cy.wrap({displayName: categoryName});
}
Cypress.Commands.add('uiMoveChannelToCategory', uiMoveChannelToCategory);
declare global {
    namespace Cypress {
        interface Chainable {
            uiCreateSidebarCategory: typeof uiCreateSidebarCategory;
            uiMoveChannelToCategory: typeof uiMoveChannelToCategory;
        }
    }
}