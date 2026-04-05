import * as TIMEOUTS from '../../../fixtures/timeouts';
describe('Messaging', () => {
    let offTopicUrl;
    let testChannelName;
    let user;
    before(() => {
        cy.apiInitSetup({loginAfter: true}).then((out) => {
            offTopicUrl = out.offTopicUrl;
            testChannelName = out.channel.display_name;
            user = out.user;
        });
    });
    beforeEach(() => {
        cy.visit(offTopicUrl);
    });
    it('MM-T200 Focus move to main input box when a character key is selected', () => {
        cy.postMessage('Hello');
        cy.uiGetSavedPostButton().click();
        cy.uiGetPostTextBox().should('not.be.focused');
        cy.get('body').type('A');
        cy.uiGetPostTextBox().should('be.focused');
        cy.uiGetRecentMentionButton().click();
        cy.uiGetPostTextBox().should('not.be.focused');
        cy.get('body').type('B');
        cy.uiGetPostTextBox().should('be.focused');
    });
    it('MM-T204 Focus will move to main input box after a new channel has been opened', () => {
        cy.postMessage('new post');
        cy.clickPostCommentIcon();
        cy.uiGetReplyTextBox().focus().should('be.focused');
        cy.typeCmdOrCtrl().type('K', {release: true});
        cy.get('#quickSwitchHint').should('be.visible');
        cy.findByRole('combobox', {name: 'quick switch input'}).type(testChannelName).wait(TIMEOUTS.HALF_SEC).type('{enter}');
        cy.get('#channelHeaderTitle').should('be.visible').should('contain', testChannelName);
        cy.uiGetPostTextBox().should('be.focused');
    });
    it('MM-T205 Focus to remain in RHS textbox each time Reply arrow is clicked', () => {
        cy.postMessage('new post');
        cy.clickPostCommentIcon();
        cy.uiGetReplyTextBox().should('be.focused');
        cy.get('#rhsContainer .post-right__content').click();
        cy.clickPostCommentIcon();
        cy.uiGetReplyTextBox().should('be.focused');
    });
    it('MM-T205 Focus to remain in RHS textbox when replying to reply post in center channel (CRT disabled)', () => {
        cy.apiSaveCRTPreference(user.id, 'off');
        cy.postMessage('Thread root message');
        cy.clickPostCommentIcon();
        cy.uiGetReplyTextBox().type('First reply{enter}');
        cy.get('#rhsCloseButton').click();
        cy.get('.sidebar--right__header').should('not.exist');
        cy.getLastPostId().then((postId) => {
            cy.clickPostCommentIcon(postId);
            cy.get('.sidebar--right__header').should('be.visible');
            cy.uiGetReplyTextBox().should('be.focused');
            cy.get('#rhsContainer .post-right__content').click();
            cy.clickPostCommentIcon(postId);
        });
        cy.uiGetReplyTextBox().should('be.focused');
    });
    it('MM-T203 Focus does not move when it has already been set elsewhere', () => {
        verifyFocusInAddChannelMemberModal();
    });
    it('MM-T202 Focus does not move for non-character keys', () => {
        cy.postMessage('Hello');
        cy.uiGetSavedPostButton().click();
        cy.uiGetPostTextBox().should('not.be.focused');
        const numLockKeycode = 144;
        const f7Keycode = 118;
        const windowsKeycode = 91;
        [numLockKeycode, f7Keycode, windowsKeycode].forEach((keycode) => {
            cy.get('body').trigger('keydown', {keyCode: keycode, which: keycode});
            cy.uiGetPostTextBox().should('not.be.focused');
        });
        ['{downarrow}', '{pagedown}', '{shift}', '{pageup}', '{enter}'].forEach((key) => {
            cy.get('body').type(key);
            cy.uiGetPostTextBox().should('not.be.focused');
        });
    });
});
function verifyFocusInAddChannelMemberModal() {
    cy.get('#channelHeaderTitle').click();
    cy.get('#channelLeaveChannel').should('be.visible');
    cy.get('#channelMembers').click();
    cy.uiGetButton('Add').click();
    cy.get('#addUsersToChannelModal').should('be.visible');
    cy.get('#selectItems input').should('be.focused');
    cy.focused().typeWithForce('A');
    cy.get('#selectItems input').should('have.value', 'A');
    cy.get('#selectItems input').blur();
    cy.get('#selectItems input').should('not.be.focused');
    cy.get('body').type('A');
    cy.get('#selectItems input').should('not.be.focused').and('have.value', 'A');
    cy.uiGetPostTextBox().should('not.be.focused');
}