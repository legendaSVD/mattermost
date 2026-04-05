const pinnedPosts = [];
function pinPost(index) {
    cy.getNthPostId(index).then((postId) => {
        cy.clickPostDotMenu(postId);
        cy.get(`#pin_post_${postId}`).click();
        pinnedPosts.push(postId);
    });
}
describe('Messaging', () => {
    before(() => {
        cy.apiInitSetup({loginAfter: true}).then(({team}) => {
            cy.visit(`/${team.name}/channels/off-topic`);
        });
    });
    it('MM-T142 Pinning or un-pinning older message does not cause it to display at bottom of channel Pinned posts display in RHS with newest at top', () => {
        cy.uiGetPostTextBox();
        const olderPost = 7;
        for (let i = olderPost; i > 0; --i) {
            cy.postMessage(i);
        }
        pinPost(-4);
        pinPost(-6);
        cy.get('#channelHeaderPinButton').click();
        cy.get('.files-or-messages-panel').children().should('have.length', 2);
        cy.get('#searchResultsCloseButton').click();
        cy.getNthPostId(-olderPost).then((postId) => {
            cy.get(`#post_${postId}`).scrollIntoView();
            pinPost(-olderPost);
            cy.get(`#postMessageText_${postId}`).invoke('text').then((pinnedPostText) => {
                cy.getLastPostId().then((lastPostId) => {
                    cy.get(`#post_${lastPostId}`).scrollIntoView();
                    cy.get(`#postMessageText_${lastPostId}`).should('not.contain', pinnedPostText);
                    cy.get('#channelHeaderPinButton').click();
                    cy.get('.files-or-messages-panel').children().should('have.length', 3);
                    cy.get('.files-or-messages-panel').children().eq(0).get(`#postMessageText_${lastPostId}`);
                    cy.get('.files-or-messages-panel').children().eq(2).get(`#postMessageText_${postId}`).and('contain', pinnedPostText);
                    cy.get(`#post_${postId}`).scrollIntoView();
                    cy.clickPostDotMenu(postId);
                    cy.get(`#unpin_post_${postId}`).click();
                    cy.get('.files-or-messages-panel').children().should('have.length', 2);
                    cy.get('.files-or-messages-panel').children().should('not.contain', `#rhsPostMessageText_${postId}`);
                });
            });
        });
    });
});