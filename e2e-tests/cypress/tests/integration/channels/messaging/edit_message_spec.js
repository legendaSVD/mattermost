import * as TIMEOUTS from '../../../fixtures/timeouts';
describe('Edit Message', () => {
    let offTopicUrl;
    before(() => {
        cy.apiInitSetup({loginAfter: true}).then((out) => {
            offTopicUrl = out.offTopicUrl;
        });
    });
    beforeEach(() => {
        cy.visit(offTopicUrl);
    });
    it('MM-T121 Escape should not close modal when an autocomplete drop down is in use', () => {
        cy.postMessage('Hello World!');
        cy.uiGetPostTextBox().type('{uparrow}');
        cy.get('#edit_textbox').type(' @');
        cy.get('#suggestionList').should('be.visible');
        cy.get('#edit_textbox').wait(TIMEOUTS.HALF_SEC).focus().type('{esc}');
        cy.get('#edit_textbox').should('have.value', 'Hello World! @');
        cy.get('#suggestionList').should('not.exist');
        cy.get('#edit_textbox').type(' ~');
        cy.get('#suggestionList').should('be.visible');
        cy.get('#edit_textbox').wait(TIMEOUTS.HALF_SEC).type('{esc}');
        cy.get('#edit_textbox').should('have.value', 'Hello World! @ ~');
        cy.get('#suggestionList').should('not.exist');
        cy.wait(TIMEOUTS.HALF_SEC);
        cy.get('div.post-edit__container button#emojiPickerButton').click();
        cy.get('#emojiPicker').should('be.visible');
        cy.get('#emojiPickerSearch').wait(TIMEOUTS.HALF_SEC).type('{esc}');
        cy.get('#emojiPicker').should('not.exist');
    });
    it('MM-T102 Timestamp on edited post shows original post time', () => {
        cy.postMessage('Checking timestamp');
        cy.getLastPostId().then((postId) => {
            cy.get(`#post_${postId}`).trigger('mouseover');
            cy.get(`#CENTER_time_${postId}`).find('time').invoke('attr', 'dateTime').then((originalTimeStamp) => {
                cy.clickPostDotMenu(postId);
                cy.get(`#edit_post_${postId}`).click();
                cy.get('#edit_textbox').type('Some text {enter}', {delay: 100});
                cy.get(`#post_${postId}`).trigger('mouseover');
                cy.get(`#CENTER_time_${postId}`).find('time').should('have.attr', 'dateTime').and('equal', originalTimeStamp);
                cy.clickPostCommentIcon(postId);
                cy.get('#rhsContainer').should('be.visible');
                cy.get(`#CENTER_time_${postId}`).find('time').invoke('attr', 'dateTime').should('equal', originalTimeStamp);
            });
        });
    });
    it('MM-T97 Open edit modal immediately after making a post', () => {
        const firstMessage = 'Hello';
        cy.postMessage(firstMessage);
        cy.getLastPostId().then((postId) => {
            const postText = `#postMessageText_${postId}`;
            cy.get(postText).should('have.text', firstMessage);
        });
        const secondMessage = 'World!';
        cy.postMessage(secondMessage);
        cy.getLastPostId().then((postId) => {
            const postText = `#postMessageText_${postId}`;
            cy.get(postText).should('have.text', secondMessage);
            cy.uiGetPostTextBox().type('{uparrow}');
            cy.get('#edit_textbox').should('be.visible');
            cy.get('#edit_textbox').should('have.text', secondMessage).type(' Another new message{enter}', {delay: 100});
            cy.get('#edit_textbox').should('not.exist');
            cy.get(postText).should('have.text', `${secondMessage} Another new message Edited`);
        });
    });
    it('MM-T5416 should discard any changes made after cancelling the edit and opening the edit textbox again should display the original message', () => {
        const message = 'World!';
        cy.postMessage(message);
        cy.getLastPostId().then((postId) => {
            const postText = `#postMessageText_${postId}`;
            cy.get(postText).should('have.text', message);
            cy.uiGetPostTextBox().type('{uparrow}');
            cy.get('#edit_textbox').should('be.visible');
            cy.get('#edit_textbox').should('have.text', message).type(' Another new message{esc}', {delay: 100});
            cy.get('#edit_textbox').should('not.exist');
            cy.get(postText).should('have.text', message);
        });
        cy.getLastPostId().then((postId) => {
            const postText = `#postMessageText_${postId}`;
            cy.get(postText).should('have.text', message);
            cy.uiGetPostTextBox().type('{uparrow}');
            cy.get('#edit_textbox').should('be.visible');
            cy.get('#edit_textbox').should('have.text', message);
        });
    });
    it('MM-T121_2 @mention in edit post should show warning, Editing this message with an @mention will not notify the recipient.', () => {
        cy.postMessage('Hello World!');
        cy.uiGetPostTextBox().type('{uparrow}');
        cy.get('#edit_textbox').type(' @user');
        cy.get('#edit_textbox').wait(TIMEOUTS.HALF_SEC).focus().type('{enter}', {delay: 100});
        cy.get('.post-body__info').should('be.visible');
        cy.get('.post-body__info').contains('span', "Editing this message with an '@mention' will not notify the recipient.");
        cy.get('#edit_textbox').wait(TIMEOUTS.HALF_SEC).focus().type('{enter}', {delay: 100});
        cy.getLastPostId().then((postId) => {
            cy.clickPostCommentIcon(postId);
        });
        cy.uiGetPostTextBox().type('{uparrow}');
        cy.get('.post-body__info').should('be.visible');
        cy.get('.post-body__info').contains('span', "Editing this message with an '@mention' will not notify the recipient.");
    });
});