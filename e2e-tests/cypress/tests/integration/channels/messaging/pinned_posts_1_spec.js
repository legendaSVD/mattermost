describe('Messaging', () => {
    let testTeam;
    let testChannel;
    let testUser;
    before(() => {
        cy.apiInitSetup().then(({team, channel, user}) => {
            testUser = user;
            testTeam = team;
            testChannel = channel;
            cy.apiLogin(testUser);
        });
    });
    beforeEach(() => {
        cy.visit(`/${testTeam.name}/channels/${testChannel.name}`);
    });
    it('MM-T2167 Pin a post, view pinned posts', () => {
        cy.postMessage('This is a post that is going to be pinned.');
        cy.getLastPostId().then((postId) => {
            cy.uiClickPostDropdownMenu(postId, 'Pin to Channel');
            cy.uiGetChannelPinButton().click();
            cy.get('#sidebar-right').should('be.visible').and('contain', 'Pinned messages').and('contain', `${testChannel.display_name}`);
            cy.get(`#rhsPostMessageText_${postId}`).should('exist');
            cy.get(`#post_${postId}`).findByText('Pinned').should('exist');
            cy.get(`#rhsPostMessageText_${postId}`).findByText('Pinned').should('not.exist');
        });
    });
    it('MM-T2168 Un-pin a post, disappears from pinned posts RHS', () => {
        cy.postMessage('This is a post that is going to be pinned then removed.');
        cy.getLastPostId().then((postId) => {
            cy.uiClickPostDropdownMenu(postId, 'Pin to Channel');
            cy.get(`#post_${postId}`).findByText('Pinned').should('exist');
            cy.uiGetChannelPinButton().click();
            cy.get(`#rhsPostMessageText_${postId}`).should('exist');
            cy.uiClickPostDropdownMenu(postId, 'Unpin from Channel');
            cy.get(`#rhsPostMessageText_${postId}`).should('not.exist');
            cy.get(`#post_${postId}`).findByText('Pinned').should('not.exist');
        });
    });
    it('MM-T2169 Un-pinning a post in center also removes badge from *search results* RHS', () => {
        cy.postMessage('Hello');
        cy.getLastPostId().then((postId) => {
            cy.uiClickPostDropdownMenu(postId, 'Pin to Channel');
            cy.uiGetSearchBox().type('Hello').type('{enter}');
            cy.get(`#searchResult_${postId}`).findByText('Pinned').should('exist');
            cy.uiClickPostDropdownMenu(postId, 'Unpin from Channel');
            cy.get(`#searchResult_${postId}`).findByText('Pinned').should('not.exist');
        });
    });
    it('MM-T2170 Un-pinning a post in *permalink* view also removes badge from saved posts RHS', () => {
        cy.postMessage('Permalink post.');
        cy.getLastPostId().then((postId) => {
            cy.uiClickPostDropdownMenu(postId, 'Pin to Channel');
            cy.clickPostSaveIcon(postId);
            cy.uiGetSavedPostButton().should('exist').click();
            cy.get(`#searchResult_${postId}`).should('exist');
            cy.get('a.search-item__jump').first().click();
            cy.get(`#post_${postId}`).
                and('have.class', 'post--highlight');
            cy.uiClickPostDropdownMenu(postId, 'Unpin from Channel');
            cy.get(`#post_${postId}`).findByText('Pinned').should('not.exist');
            cy.get(`#searchResult_${postId}`).findByText('Pinned').should('not.exist');
        });
    });
    it('MM-T2171 Un-pinning and pinning a post in center also removes and adds badge in *saved posts* RHS', () => {
        cy.postMessage('This is a post that is going to be pinned then removed, then pinned again.');
        cy.getLastPostId().then((postId) => {
            cy.uiClickPostDropdownMenu(postId, 'Pin to Channel');
            cy.clickPostSaveIcon(postId);
            cy.uiGetSavedPostButton().click();
            cy.get(`#searchResult_${postId}`).findByText('Pinned').should('exist');
            cy.uiClickPostDropdownMenu(postId, 'Unpin from Channel');
            cy.get(`#post_${postId}`).findByText('Pinned').should('not.exist');
            cy.get(`#searchResult_${postId}`).findByText('Pinned').should('not.exist');
            cy.uiClickPostDropdownMenu(postId, 'Pin to Channel');
            cy.get(`#post_${postId}`).findByText('Pinned').should('exist');
            cy.get(`#searchResult_${postId}`).findByText('Pinned').should('exist');
        });
    });
    it('MM-T2172 Non-pinned replies do not appear with parent post in pinned posts RHS', () => {
        cy.postMessage('This is a post that is going to be pinned and replied.');
        cy.getLastPostId().then((postId) => {
            cy.uiClickPostDropdownMenu(postId, 'Pin to Channel');
            cy.clickPostCommentIcon(postId);
            cy.postMessageReplyInRHS('This is a reply');
            cy.getLastPostId().then((replyPostId) => {
                cy.uiGetChannelPinButton().click();
                cy.get(`#rhsPostMessageText_${postId}`).should('exist');
                cy.get(`#rhsPostMessageText_${replyPostId}`).should('not.exist');
            });
        });
    });
});