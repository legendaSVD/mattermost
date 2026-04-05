const TIMEOUTS = require('../../../fixtures/timeouts');
describe('Message Reply', () => {
    let mainChannel;
    let otherChannel;
    let rootId;
    before(() => {
        cy.apiInitSetup({loginAfter: true}).then(({team, channel}) => {
            mainChannel = channel;
            cy.apiCreateChannel(team.id, 'other', 'other').then(({channel: newChannel}) => {
                otherChannel = newChannel;
            });
            cy.visit(`/${team.name}/channels/${channel.name}`);
        });
    });
    it('MM-T2132 - Message sends: just text', () => {
        const msg = 'Hello';
        cy.uiGetPostTextBox().type(msg);
        cy.uiGetPostTextBox().type('{enter}');
        cy.getLastPostId().then((postId) => {
            rootId = postId;
            cy.get(`#postMessageText_${postId}`).should('be.visible').and('have.text', msg);
        });
    });
    it('MM-T2133 - Reply arrow opens RHS with Reply button disabled until text entered', () => {
        cy.uiClickPostDropdownMenu(rootId, 'Reply', 'CENTER');
        cy.get('#rhsContainer').should('be.visible');
        cy.uiGetReply().should('be.disabled');
        cy.uiGetReplyTextBox().type('A');
        cy.uiGetReply().should('not.be.disabled');
        cy.uiGetReplyTextBox().clear();
        cy.uiCloseRHS();
    });
    it('MM-T2134 - Reply to message displays in RHS and center and shows reply count', () => {
        cy.clickPostCommentIcon(rootId);
        const msg = 'reply1';
        cy.uiGetReplyTextBox().type(msg);
        cy.uiReply();
        cy.getLastPostId().then((replyId) => {
            cy.get(`#post_${replyId}`).within(() => {
                cy.get(`#postMessageText_${replyId}`).should('be.visible').and('have.text', msg);
            });
            cy.get(`#rhsPost_${replyId}`).within(() => {
                cy.get(`#rhsPostMessageText_${replyId}`).should('be.visible').and('have.text', msg);
            });
            cy.get(`#CENTER_commentIcon_${rootId} .post-menu__comment-count`).should('be.visible').and('have.text', '1');
        });
        cy.uiCloseRHS();
    });
    it('MM-T2135 - Can open reply thread from reply count arrow and reply', () => {
        cy.clickPostCommentIcon(rootId);
        const msg = 'reply2';
        cy.uiGetReplyTextBox().type(msg);
        cy.uiGetReplyTextBox().type('{enter}');
        cy.getLastPostId().then((replyId) => {
            cy.get(`#post_${replyId}`).within(() => {
                cy.get(`#postMessageText_${replyId}`).should('be.visible').and('have.text', msg);
            });
            cy.get(`#rhsPost_${replyId}`).within(() => {
                cy.get(`#rhsPostMessageText_${replyId}`).should('be.visible').and('have.text', msg);
            });
        });
        cy.uiCloseRHS();
    });
    it('MM-T2136 - Reply in RHS with different channel open in center', () => {
        cy.uiClickPostDropdownMenu(rootId, 'Reply', 'CENTER');
        cy.get(`#sidebarItem_${otherChannel.name}`).click().wait(TIMEOUTS.FIVE_SEC);
        const msg = 'reply3';
        cy.uiGetReplyTextBox().type(msg);
        cy.uiReply().wait(TIMEOUTS.HALF_SEC);
        cy.get('#channelHeaderTitle').should('contain', otherChannel.display_name);
        cy.get(`#sidebarItem_${mainChannel.name}`).should('not.have.class', 'unread-title');
        cy.uiCloseRHS();
    });
});