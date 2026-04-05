import * as TIMEOUTS from '../../../fixtures/timeouts';
describe('Post Header', () => {
    let testTeam;
    before(() => {
        cy.apiInitSetup({loginAfter: true}).then(({team}) => {
            testTeam = team;
            cy.visit(`/${testTeam.name}/channels/off-topic`);
        });
    });
    beforeEach(() => {
        cy.visit(`/${testTeam.name}/channels/off-topic`);
    });
    it('should render permalink view on click of post timestamp at center view', () => {
        cy.postMessage('test for permalink');
        cy.getLastPostId().then((postId) => {
            const divPostId = `#post_${postId}`;
            cy.get(divPostId).should('be.visible').should('not.have.class', 'post--highlight');
            cy.clickPostTime(postId);
            cy.url().should('include', `/${testTeam.name}/channels/off-topic/${postId}`);
            cy.get(divPostId).should('be.visible').and('have.class', 'post--highlight');
            cy.url({timeout: TIMEOUTS.TEN_SEC}).should('include', `/${testTeam.name}/channels/off-topic`).and('not.include', `/${postId}`);
            cy.get(divPostId).should('be.visible').and('not.have.class', 'post--highlight');
        });
    });
    it('should open dropdown menu on click of dot menu icon', () => {
        cy.postMessage('test for dropdown menu');
        cy.getLastPostId().then((postId) => {
            cy.get(`#post_${postId}`).should('be.visible');
            cy.get(`#CENTER_button_${postId}`).should('not.be.visible');
            cy.get(`#CENTER_dropdown_${postId}`).should('not.exist');
            cy.clickPostDotMenu(postId);
            cy.get(`#post_${postId}`).should('be.visible');
            cy.get(`#CENTER_button_${postId}`).should('be.visible');
            cy.get('body').type('{esc}');
            cy.uiGetPostTextBox().click();
            cy.get(`#post_${postId}`).should('be.visible');
            cy.get(`#CENTER_button_${postId}`).should('not.be.visible');
            cy.get(`#CENTER_dropdown_${postId}`).should('not.exist');
        });
    });
    it('should open and close Emoji Picker on click of reaction icon', () => {
        cy.postMessage('test for reaction and emoji picker');
        cy.getLastPostId().then((postId) => {
            cy.get(`#CENTER_reaction_${postId}`).should('not.be.visible');
            cy.get('#emojiPicker').should('not.exist');
            cy.clickPostReactionIcon(postId);
            cy.get(`#CENTER_reaction_${postId}`).should('be.visible').and('have.class', 'post-menu__item--active').and('have.class', 'post-menu__item--reactions');
            cy.get('#emojiPicker').should('be.visible');
            cy.clickPostReactionIcon(postId);
            cy.uiGetPostTextBox().click();
            cy.get(`#CENTER_reaction_${postId}`).should('not.be.visible');
            cy.get('#emojiPicker').should('not.exist');
        });
    });
    it('should open RHS on click of comment icon and close on RHS\' close button', () => {
        cy.postMessage('test for opening and closing RHS');
        cy.clickPostCommentIcon();
        cy.get('#rhsContainer').should('be.visible');
        cy.uiCloseRHS();
        cy.get('#rhsContainer').should('not.exist');
    });
    it('MM-T122 Visual verification of "Searching" animation for Saved and Pinned posts', () => {
        cy.delayRequestToRoutes(['pinned', 'flagged'], 5000);
        cy.reload();
        cy.postMessage('Post');
        cy.getLastPostId().then((postId) => {
            cy.clickPostDotMenu(postId);
            cy.get(`#pin_post_${postId}`).click();
            cy.clickPostSaveIcon(postId);
        });
        cy.uiGetChannelPinButton().click();
        cy.get('#searchContainer').should('be.visible').within(() => {
            cy.get('#loadingSpinner', {timeout: TIMEOUTS.FIVE_SEC}).should('be.visible').and('have.text', 'Searching...');
            cy.get('#search-items-container').should('be.visible');
            cy.get('#searchResultsCloseButton').should('be.visible').click();
        });
        cy.uiGetSavedPostButton().click();
        cy.get('#searchContainer').should('be.visible').within(() => {
            cy.get('#loadingSpinner').should('be.visible').and('have.text', 'Searching...');
            cy.get('#search-items-container').should('be.visible');
            cy.get('#searchResultsCloseButton').should('be.visible').click();
        });
    });
});