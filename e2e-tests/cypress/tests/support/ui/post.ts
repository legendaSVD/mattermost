import {ChainableT} from '../../types';
function uiGetPostTextBox(option = {exist: true}): ChainableT<JQuery> {
    if (option.exist) {
        return cy.get('#post_textbox').should('be.visible');
    }
    return cy.get('#post_textbox').should('not.exist');
}
Cypress.Commands.add('uiGetPostTextBox', uiGetPostTextBox);
function uiGetReplyTextBox(option = {exist: true}): ChainableT<JQuery> {
    if (option.exist) {
        return cy.get('#reply_textbox').should('be.visible');
    }
    return cy.get('#reply_textbox').should('not.exist');
}
Cypress.Commands.add('uiGetReplyTextBox', uiGetReplyTextBox);
function uiGetPostProfileImage(postId: string): ChainableT<JQuery> {
    return getPost(postId).within(() => {
        return cy.get('.post__img').should('be.visible');
    });
}
Cypress.Commands.add('uiGetPostProfileImage', uiGetPostProfileImage);
function uiGetPostHeader(postId: string): ChainableT<JQuery> {
    return getPost(postId).within(() => {
        return cy.get('.post__header').should('be.visible');
    });
}
Cypress.Commands.add('uiGetPostHeader', uiGetPostHeader);
function uiGetPostBody(postId: string): ChainableT<JQuery> {
    return getPost(postId).within(() => {
        return cy.get('.post__body').should('be.visible');
    });
}
Cypress.Commands.add('uiGetPostBody', uiGetPostBody);
function uiGetPostThreadFooter(postId: string): ChainableT<JQuery> {
    return getPost(postId).find('.ThreadFooter');
}
Cypress.Commands.add('uiGetPostThreadFooter', uiGetPostThreadFooter);
function uiGetPostEmbedContainer(postId: string): ChainableT<JQuery> {
    return cy.uiGetPostBody(postId).
        find('.file-preview__button').
        should('be.visible');
}
Cypress.Commands.add('uiGetPostEmbedContainer', uiGetPostEmbedContainer);
function getPost(postId: string): ChainableT<JQuery> {
    if (postId) {
        return cy.get(`#post_${postId}`).should('be.visible');
    }
    return cy.getLastPost();
}
Cypress.Commands.add('getPost', getPost);
function editLastPostWithNewMessage(message: string) {
    cy.uiGetPostTextBox().type('{uparrow}');
    cy.get('#edit_textbox').should('be.visible');
    cy.get('#edit_textbox').clear().type(message)
    cy.get('#create_post').findByText('Save').scrollIntoView().click();
}
Cypress.Commands.add('editLastPostWithNewMessage', editLastPostWithNewMessage);
export function verifySavedPost(postId, message) {
    cy.get(`#post_${postId}`).trigger('mouseover', {force: true});
    cy.get(`#CENTER_flagIcon_${postId}`).
        should('have.class', 'post-menu__item').
        and('have.attr', 'aria-label', 'remove from saved');
    cy.clickPostDotMenu(postId, 'CENTER');
    cy.findAllByTestId(`post-menu-${postId}`).eq(0).should('be.visible');
    cy.findByText('Remove from Saved').scrollIntoView().should('be.visible');
    cy.get('body').type('{esc}');
    cy.get('#postListContent').within(() => {
        cy.get(`#post_${postId}`).should('have.class', 'post--pinned-or-flagged');
        cy.get('div.post-pre-header').should('be.visible');
        cy.get('span.icon--post-pre-header').
            should('be.visible').
            within(() => {
                cy.get('svg').should('have.attr', 'aria-label', 'Saved Icon');
            });
        cy.get('div.post-pre-header__text-container').
            should('be.visible').
            and('have.text', 'Saved').
            within(() => {
                cy.get('a').as('savedLink').should('be.visible');
            });
    });
    cy.get('#searchContainer').should('not.exist');
    cy.get('@savedLink').click();
    cy.get('#searchContainer').should('be.visible').within(() => {
        cy.get('.sidebar--right__title').
            should('be.visible').
            and('have.text', 'Saved messages');
        cy.get(`#searchResult_${postId}`).within(() => {
            cy.get(`#rhsPostMessageText_${postId}`).contains(message);
            cy.get('div.post-pre-header').should('not.exist');
        });
    });
    cy.get('#searchResultsCloseButton').should('be.visible').click();
}
export function verifyUnsavedPost(postId) {
    cy.get(`#post_${postId}`).trigger('mouseover', {force: true});
    cy.get(`#CENTER_flagIcon_${postId}`).
        should('have.class', 'post-menu__item').
        and('have.attr', 'aria-label', 'save message');
    cy.clickPostDotMenu(postId, 'CENTER');
    cy.findAllByTestId(`post-menu-${postId}`).eq(0).should('be.visible');
    cy.findByText('Save Message').scrollIntoView().should('be.visible');
    cy.get('body').type('{esc}');
    cy.get('#postListContent').within(() => {
        cy.get(`#post_${postId}`).should('not.have.class', 'post--pinned-or-flagged');
        cy.get('div.post-pre-header').should('not.exist');
        cy.get('span.icon--post-pre-header').
            should('not.exist');
        cy.get('div.post-pre-header__text-container').
            should('not.exist');
    });
    cy.get('#searchContainer').should('not.exist');
    cy.uiGetSavedPostButton().click();
    cy.get('#searchContainer').should('be.visible').within(() => {
        cy.get('.sidebar--right__title').
            should('be.visible').
            and('have.text', 'Saved messages');
        cy.get('#search-items-container').within(() => {
            cy.get(`#rhsPostMessageText_${postId}`).should('not.exist');
        });
    });
    cy.get('#searchResultsCloseButton').should('be.visible').click();
}
declare global {
    namespace Cypress {
        interface Chainable {
            editLastPostWithNewMessage: typeof editLastPostWithNewMessage;
            uiGetPostProfileImage: typeof uiGetPostProfileImage;
            uiGetPostHeader: typeof uiGetPostHeader;
            uiGetPostBody: typeof uiGetPostBody;
            uiGetPostThreadFooter: typeof uiGetPostThreadFooter;
            uiGetPostEmbedContainer: typeof uiGetPostEmbedContainer;
            uiGetPostTextBox: typeof uiGetPostTextBox;
            uiGetReplyTextBox: typeof uiGetReplyTextBox;
            getPost: typeof getPost;
        }
    }
}