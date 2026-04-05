import * as TIMEOUTS from '../../../fixtures/timeouts';
describe('Post Edit History', () => {
    let offtopiclink: string;
    before(() => {
        cy.apiInitSetup({loginAfter: true}).then(({team}) => {
            offtopiclink = `/${team.name}/channels/off-topic`;
            cy.visit(offtopiclink);
        });
    });
    beforeEach(() => {
        cy.url().should('include', offtopiclink);
        cy.postMessage('This is a sample message');
        cy.getLastPostId().then((postId) => {
            editMessage(postId);
        });
    });
    it('MM-T5381_1 Show and restore older versions of a message', () => {
        cy.getLastPostId().then((postId) => {
            openEditHistory(postId);
            cy.get(`#rhsPostMessageText_${postId}`).should('have.text', 'This is the final version of the sample message');
            cy.get('#rhsContainer').find('.edit-post-history__container').should('have.length', 3);
            cy.get('#rhsContainer').find('.edit-post-history__container').eq(1).click();
            cy.get('#rhsContainer').find('.post-message__text').eq(1).should('have.text', 'This is an edited sample message');
            cy.get('#rhsContainer').find('.edit-post-history__container').eq(2).click();
            cy.get('#rhsContainer').find('.post-message__text').eq(2).should('have.text', 'This is a sample message');
            cy.get('#rhsContainer').find('.restore-icon').eq(0).click();
            cy.get('.confirm').click();
            cy.wait(TIMEOUTS.HALF_SEC);
            cy.get(`#postMessageText_${postId}`).should('have.text', 'This is an edited sample message Edited');
        });
    });
    it('MM-T5381_2 Show, restore older versions of a message and click undo in toast', () => {
        cy.getLastPostId().then((postId) => {
            openEditHistory(postId);
            cy.get('#rhsContainer').find('.restore-icon').eq(0).click();
            cy.get('.confirm').click();
            cy.wait(TIMEOUTS.HALF_SEC);
            cy.get('.info-toast__undo').click();
            cy.wait(TIMEOUTS.HALF_SEC);
            cy.get(`#postMessageText_${postId}`).should('have.text', 'This is the final version of the sample message Edited');
        });
    });
    it('MM-T5381_3 Edit history should not be available when user lacks edit own posts permissions', () => {
        cy.apiAdminLogin();
        cy.apiUpdateConfig({
            ServiceSettings: {
                PostEditTimeLimit: -1,
            },
        });
        cy.reload();
        cy.getLastPostId().then((postId) => {
            cy.get(`#postEdited_${postId}`).click();
            cy.get('#rhsContainer').find('.sidebar--right__title').should('not.contain.text', 'Edit History');
        });
    });
});
const editMessage = (postId: string) => {
    cy.clickPostDotMenu();
    cy.get(`#edit_post_${postId}`).click();
    cy.get('#edit_textbox').
        should('be.visible').
        and('be.focused').
        wait(TIMEOUTS.HALF_SEC).
        clear().
        type('This is an edited sample message').
        type('{enter}');
    cy.clickPostDotMenu();
    cy.get(`#edit_post_${postId}`).click();
    cy.get('#edit_textbox').
        should('be.visible').
        and('be.focused').
        wait(TIMEOUTS.HALF_SEC).
        clear().
        type('This is the final version of the sample message').
        type('{enter}');
};
const openEditHistory = (postId: string) => {
    cy.get(`#postEdited_${postId}`).click();
    cy.get('#rhsContainer').should('exist');
};