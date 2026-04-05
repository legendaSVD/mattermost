import {getAdminAccount} from '../../../support/env';
describe('pinned messages', () => {
    let testTeam;
    let testChannel;
    let testUser;
    let otherUser;
    before(() => {
        cy.apiInitSetup().then(({team, channel, user}) => {
            testUser = user;
            testTeam = team;
            testChannel = channel;
            return cy.apiCreateUser();
        }).then(({user: user1}) => {
            otherUser = user1;
            return cy.apiAddUserToTeam(testTeam.id, otherUser.id);
        }).then(() => {
            cy.apiAddUserToChannel(testChannel.id, otherUser.id);
        });
    });
    it('MM-T2173 Un-pinning a post from reply RHS also removes badge in center', () => {
        cy.apiLogin(testUser);
        cy.visit(`/${testTeam.name}/channels/${testChannel.name}`);
        cy.postMessage('Hello');
        cy.getLastPostId().then((postId) => {
            pinPost(postId);
            cy.get(`#post_${postId}`).trigger('mouseover');
            cy.get(`#CENTER_commentIcon_${postId}`).click({force: true});
            cy.get(`#rhsPost_${postId}`).find('.post-pre-header').should('be.visible').and('have.text', 'Pinned');
            cy.get(`#post_${postId}`).find('.post-pre-header').should('be.visible').and('have.text', 'Pinned');
            unpinPost(postId);
            cy.get(`#rhsPost_${postId}`).find('.post-pre-header').should('not.exist');
            cy.get(`#post_${postId}`).find('.post-pre-header').should('not.exist');
            cy.uiGetChannelPinButton().click();
            cy.get('#search-items-container .no-results__title').should('have.text', 'No pinned messages yet');
        });
    });
    it('MM-T2174 Switching channels in center also changes pinned messages RHS', () => {
        cy.apiLogin(testUser);
        cy.visit(`/${testTeam.name}/channels/${testChannel.name}`);
        cy.getLastPostId().then((postId) => {
            pinPost(postId);
            cy.uiGetChannelPinButton().click();
            cy.findByTestId('search-item-container').should('have.length', 1);
            cy.get('#sidebarItem_town-square').should('be.visible').click();
            cy.get('#search-items-container .no-results__title').should('have.text', 'No pinned messages yet');
            cy.findByTestId('search-item-container').should('not.exist');
            cy.visit(`/${testTeam.name}/channels/${testChannel.name}`);
            unpinPost(postId);
        });
    });
    it('MM-T2175 Pin a post in a DM channel Pin a post while viewing empty pinned post RHS', () => {
        cy.apiCreateDirectChannel([testUser.id, otherUser.id]).then(() => {
            cy.apiLogin(testUser);
            cy.visit(`/${testTeam.name}/channels/${testUser.id}__${otherUser.id}`);
            cy.uiGetChannelPinButton().click();
            cy.postMessage('Hello');
            return cy.getLastPostId();
        }).then((postId) => {
            cy.findByTestId('search-item-container').should('not.exist');
            pinPost(postId);
            cy.get(`#rhsPostMessageText_${postId}`).should('exist');
            cy.get(`#post_${postId} .post-pre-header`).should('have.text', 'Pinned');
        });
    });
    it('MM-T2177 Deleting pinned post while viewing RHS pinned messages removes post from RHS', () => {
        cy.apiLogin(testUser);
        cy.visit(`/${testTeam.name}/channels/${testChannel.name}`);
        cy.uiGetChannelPinButton().click();
        cy.get('#search-items-container .no-results__title').should('have.text', 'No pinned messages yet');
        cy.postMessage('Hello again');
        cy.getLastPostId().then((postId) => {
            pinPost(postId);
            cy.get(`#rhsPostMessageText_${postId}`).should('exist');
            cy.get(`#post_${postId} .post-pre-header`).should('have.text', 'Pinned');
            cy.get(`#CENTER_button_${postId}`).click({force: true});
            cy.get(`#delete_post_${postId}`).scrollIntoView().should('be.visible').click();
            cy.get('#deletePostModalButton').should('be.visible').click();
            cy.get('#search-items-container .no-results__title').should('have.text', 'No pinned messages yet');
            cy.get(`#post_${postId}`).should('not.exist');
            cy.get(`#rhsPost_${postId}`).should('not.exist');
            cy.postMessage('To be deleted by another user');
            return cy.getLastPostId();
        }).then((postId) => {
            pinPost(postId);
            cy.get(`#rhsPostMessageText_${postId}`).should('exist');
            cy.get(`#post_${postId} .post-pre-header`).should('have.text', 'Pinned');
            deletePost(postId);
            cy.get('#search-items-container .post__body').should('have.text', '(message deleted)');
            cy.get(`#post_${postId} .post-pre-header`).should('have.text', 'Pinned');
            cy.get(`#post_${postId} #${postId}_message`).should('have.text', '(message deleted)');
            cy.reload();
            cy.uiGetChannelPinButton().click();
            cy.get('#search-items-container .no-results__title').should('have.text', 'No pinned messages yet');
            cy.get(`#post_${postId}`).should('not.exist');
        });
    });
    it('MM-T2922 Pinned post count indicates the number of pinned messages in currently viewed channel', () => {
        cy.apiLogin(testUser);
        cy.visit(`/${testTeam.name}/channels/town-square`);
        cy.get('#channelPinnedPostCountText').should('not.exist');
        cy.postMessage('Town-square post');
        cy.getLastPostId().then((postId) => {
            pinPost(postId);
            cy.get('#channelPinnedPostCountText').should('have.text', '1');
            cy.visit(`/${testTeam.name}/channels/${testChannel.name}`);
            cy.get('#channelPinnedPostCountText').should('not.exist');
            cy.postMessage('Hello pinned post');
            return cy.getLastPostId();
        }).then((postId) => {
            pinPost(postId);
            cy.get('#channelPinnedPostCountText').should('have.text', '1');
            unpinPost(postId);
            cy.get('#channelPinnedPostCountText').should('not.exist');
            pinPost(postId);
            cy.postMessage('Hello second post');
            return cy.getLastPostId();
        }).then((postId) => {
            pinPost(postId);
            cy.get('#channelPinnedPostCountText').should('have.text', '2');
            cy.uiGetChannelPinButton().should('be.visible').click();
            cy.get('#sidebarItem_town-square').should('be.visible').click();
            cy.get('#channelPinnedPostCountText').should('have.text', '1');
            cy.findByTestId('search-item-container').should('have.length', 1);
        });
    });
});
function pinPost(postId) {
    cy.get(`#post_${postId}`).trigger('mouseover');
    cy.get(`#CENTER_button_${postId}`).click({force: true});
    cy.get(`#pin_post_${postId}`).scrollIntoView().should('be.visible').click();
}
function unpinPost(postId) {
    cy.get(`#post_${postId}`).trigger('mouseover');
    cy.get(`#CENTER_button_${postId}`).click({force: true});
    cy.get(`#unpin_post_${postId}`).scrollIntoView().should('be.visible').click();
}
function deletePost(postId) {
    cy.externalRequest({
        user: getAdminAccount(),
        method: 'delete',
        path: `posts/${postId}`,
    });
}