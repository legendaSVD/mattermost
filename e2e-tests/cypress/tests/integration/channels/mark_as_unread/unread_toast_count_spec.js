describe('Verify unread toast appears after repeated manual marking post as unread', () => {
    let currentChannel;
    before(() => {
        cy.apiInitSetup().then(({team, channel, user}) => {
            currentChannel = channel;
            cy.apiCreateUser().then(({user: user2}) => {
                cy.apiAddUserToTeam(team.id, user2.id).then(() => {
                    cy.apiAddUserToChannel(channel.id, user2.id);
                    Cypress._.times(30, (i) => {
                        cy.postMessageAs({
                            sender: user2,
                            message: `post${i}`,
                            channelId: channel.id,
                        });
                    });
                    cy.postMessageAs({
                        sender: user2,
                        message: `hi @${user.username}`,
                        channelId: channel.id,
                    });
                    cy.apiLogin(user);
                    cy.visit(`/${team.name}/channels/${channel.name}`);
                    cy.getLastPostId().then((postId) => {
                        cy.clickPostCommentIcon(postId);
                        cy.get('#rhsContainer').should('be.visible');
                        const replyMessage = 'A reply to an older post';
                        cy.postMessageReplyInRHS(replyMessage);
                    });
                });
            });
        });
    });
    it('MM-T254 Rehydrate mention badge after post is marked as Unread', () => {
        cy.getNthPostId(1).then((postId) => {
            cy.get(`#post_${postId}`).scrollIntoView().should('be.visible');
            cy.uiClickPostDropdownMenu(postId, 'Mark as Unread');
        });
        cy.get('div.toast').should('be.visible').then(() => {
            cy.get('div.toast__message>span').should('be.visible').contains('30 new messages');
            cy.get(`#sidebarItem_${currentChannel.name}`).
                scrollIntoView().
                find('#unreadMentions').
                should('be.visible').
                and('have.text', '1');
        });
    });
});