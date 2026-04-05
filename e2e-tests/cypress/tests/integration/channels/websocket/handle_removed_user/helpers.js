export function createNewTeamAndMoveToOffTopic(teamName, sidebarItemClass) {
    cy.createNewTeam(teamName, teamName);
    cy.uiGetLHSHeader().findByText(teamName);
    cy.get(`${sidebarItemClass}:contains(Off-Topic)`).should('be.visible').click();
    cy.url().should('include', `/${teamName}/channels/off-topic`);
    cy.get('#channelHeaderTitle').should('be.visible').should('contain', 'Off-Topic');
}
export function removeMeFromCurrentChannel() {
    let channelId;
    return cy.getCurrentChannelId().then((res) => {
        channelId = res;
        return cy.apiGetMe();
    }).then(({user}) => {
        return cy.removeUserFromChannel(channelId, user.id);
    });
}
export function verifyRHS(teamName, sidebarItemClass, postId) {
    cy.get('#removedChannelBtn').click();
    cy.url().should('include', `/${teamName}/channels/town-square`);
    cy.get('#channelHeaderTitle').should('be.visible').should('contain', 'Town Square');
    cy.get(`${sidebarItemClass}:contains(Off-Topic)`).should('not.exist');
    cy.get(`#rhsPostMessageText_${postId}`).should('not.exist');
}
export function shouldRemoveMentionsInRHS(teamName, sidebarItemClass) {
    let postId;
    cy.apiGetMe().then(({user}) => {
        const messageText = `${Date.now()} - mention to @${user.username} `;
        cy.postMessage(messageText);
        return cy.getLastPostId();
    }).then((lastPostId) => {
        postId = lastPostId;
        cy.uiGetRecentMentionButton().click();
        cy.get(`#rhsPostMessageText_${postId}`).should('exist');
        return removeMeFromCurrentChannel();
    }).then(() => {
        verifyRHS(teamName, sidebarItemClass, postId);
    });
}
export function shouldRemoveSavedPostsInRHS(teamName, sidebarItemClass) {
    let postId;
    const messageText = `${Date.now()} - post to save`;
    cy.postMessage(messageText);
    cy.getLastPostId().then((lastPostId) => {
        postId = lastPostId;
        cy.clickPostSaveIcon(postId);
        cy.uiGetSavedPostButton().click();
        cy.get(`#rhsPostMessageText_${postId}`).should('exist');
        return removeMeFromCurrentChannel();
    }).then(() => {
        verifyRHS(teamName, sidebarItemClass, postId);
    });
}