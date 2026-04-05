import {verifySavedPost, verifyUnsavedPost} from '../../../support/ui/post';
describe('Save Post', () => {
    before(() => {
        cy.apiInitSetup().then(({channelUrl}) => {
            cy.visit(channelUrl);
        });
    });
    it('MM-T4948_1 Save menu item should save post', () => {
        const message = Date.now().toString();
        cy.postMessage(message);
        cy.getLastPostId().as('postId1');
        Cypress._.times(10, (n) => {
            cy.uiPostMessageQuickly(n);
        });
        cy.get('@postId1').then((postId) => {
            cy.uiClickPostDropdownMenu(postId, 'Save Message');
            verifySavedPost(postId, message);
            cy.uiClickPostDropdownMenu(postId, 'Remove from Saved');
            verifyUnsavedPost(postId);
        });
    });
    it('MM-T4948_2 Save hotkey should save post', () => {
        const message = Date.now().toString();
        cy.postMessage(message);
        cy.getLastPostId().as('postId2');
        Cypress._.times(10, (n) => {
            cy.uiPostMessageQuickly(n);
        });
        cy.get('@postId2').then((postId) => {
            cy.clickPostDotMenu(postId, 'CENTER');
            cy.get('body').type('s');
            verifySavedPost(postId, message);
            cy.clickPostDotMenu(postId, 'CENTER');
            cy.get('body').type('s');
            verifyUnsavedPost(postId);
        });
    });
});