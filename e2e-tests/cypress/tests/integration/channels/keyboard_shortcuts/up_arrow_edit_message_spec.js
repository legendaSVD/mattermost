import * as TIMEOUTS from '../../../fixtures/timeouts';
describe('Keyboard Shortcuts', () => {
    let testTeam;
    let testChannel;
    let testUser;
    let otherUser;
    before(() => {
        cy.apiInitSetup().then(({team, channel, user}) => {
            testTeam = team;
            testChannel = channel;
            testUser = user;
            cy.apiCreateUser({prefix: 'other'}).then(({user: user1}) => {
                otherUser = user1;
                cy.apiAddUserToTeam(testTeam.id, otherUser.id).then(() => {
                    cy.apiAddUserToChannel(testChannel.id, otherUser.id);
                });
            });
        });
    });
    it('MM-T1235 Arrow up key - no Edit modal open up if user has not posted any message yet', () => {
        const message2 = 'Test message from User 2';
        cy.apiLogin(otherUser);
        cy.visit(`/${testTeam.name}/channels/${testChannel.name}`);
        cy.postMessage(message2);
        cy.apiLogout();
        cy.apiLogin(testUser);
        cy.visit(`/${testTeam.name}/channels/${testChannel.name}`);
        cy.uiGetPostTextBox().type('{uparrow}');
        cy.get('#edit_textbox').should('not.exist');
    });
    it('MM-T1236 Arrow up key - Edit Input opens up for own message of a user', () => {
        const message1 = 'Test message from User 1';
        const message2 = 'Test message from User 2';
        cy.apiLogin(testUser);
        cy.visit(`/${testTeam.name}/channels/${testChannel.name}`);
        cy.postMessage(message1);
        cy.apiLogout();
        cy.apiLogin(otherUser);
        cy.visit(`/${testTeam.name}/channels/${testChannel.name}`);
        cy.postMessage(message2);
        cy.apiLogout();
        cy.apiLogin(testUser);
        cy.visit(`/${testTeam.name}/channels/${testChannel.name}`);
        cy.uiGetPostTextBox().type('{uparrow}');
        cy.get('#edit_textbox').should('be.visible');
        cy.get('#edit_textbox').should('have.text', message1);
    });
    it('MM-T1271_1 UP - Removing all text in edit deletes post if without attachment', () => {
        const message = 'Message to be deleted';
        cy.apiLogin(testUser);
        cy.visit(`/${testTeam.name}/channels/${testChannel.name}`);
        cy.postMessage(message);
        cy.uiWaitUntilMessagePostedIncludes(message);
        cy.getLastPostId().then((postID) => {
            cy.get(`#postMessageText_${postID}`).should('contain', message);
            cy.uiGetPostTextBox().type('{uparrow}');
            cy.get('#edit_textbox').should('have.text', message);
            cy.wait(TIMEOUTS.HALF_SEC);
            cy.get('#edit_textbox').clear().type('{enter}');
            cy.findByRole('dialog', {name: 'Confirm Post Delete'}).should('be.visible');
            cy.uiGetButton('Delete').click();
            cy.get(`#postMessageText_${postID}`).should('not.exist');
        });
        cy.postMessageAs({sender: otherUser, message, channelId: testChannel.id});
        cy.uiWaitUntilMessagePostedIncludes(message);
        cy.getLastPostId().then((postID) => {
            cy.get(`#postMessageText_${postID}`).should('contain', message);
            cy.externalRequest({user: otherUser, method: 'DELETE', path: `posts/${postID}`});
            cy.get(`#post_${postID} #${postID}_message`).should('have.text', '(message deleted)');
        });
    });
    it('MM-T1271_2 UP - Removing all text in edit does not delete post if with attachment', () => {
        const message = 'This is a message';
        const filename = 'mattermost-icon.png';
        cy.apiLogin(testUser);
        cy.visit(`/${testTeam.name}/channels/${testChannel.name}`);
        cy.get('#fileUploadInput').attachFile(filename);
        cy.postMessage(message);
        cy.uiWaitUntilMessagePostedIncludes(message);
        cy.uiGetFileThumbnail(filename).should('be.visible');
        cy.uiGetPostTextBox().type('{uparrow}');
        cy.wait(TIMEOUTS.HALF_SEC);
        cy.get('#edit_textbox').clear().type('{enter}');
        cy.get('#deletePostModal').should('not.exist');
        cy.uiGetFileThumbnail(filename).should('be.visible');
        cy.getLastPostId().then((postId) => {
            cy.get(`#postEdited_${postId}`).
                should('be.visible').
                should('contain', 'Edited');
        });
        cy.apiLogout();
        cy.apiLogin(otherUser);
        cy.visit(`/${testTeam.name}/channels/${testChannel.name}`);
        cy.uiGetFileThumbnail(filename).should('be.visible');
        cy.getLastPostId().then((postId) => {
            cy.get(`#postEdited_${postId}`).
                should('be.visible').
                should('contain', 'Edited');
        });
    });
    it('MM-T1272 Arrow up key - Removing all text in edit deletes reply', () => {
        const message = 'Test message from User 1';
        const reply = 'Reply from User 1';
        cy.apiLogin(testUser);
        cy.visit(`/${testTeam.name}/channels/${testChannel.name}`);
        cy.postMessage(message);
        cy.getLastPostId().then((postId) => {
            cy.clickPostCommentIcon(postId);
            cy.postMessageReplyInRHS(reply);
        });
        cy.getLastPostId().then((postID) => {
            cy.uiGetPostTextBox().type('{uparrow}');
            cy.wait(TIMEOUTS.HALF_SEC);
            cy.get('#edit_textbox').clear().type('{enter}');
            cy.get('#deletePostModal').should('be.visible');
            cy.get('#deletePostModalButton').click();
            cy.get(`#postMessageText_${postID}`).should('not.exist');
        });
    });
    it('MM-T1269 Arrow up key - Edit code block', () => {
        const messageWithCodeblock1 = '```{shift}{enter}codeblock1{shift}{enter}```{shift}{enter}';
        const messageWithCodeblock2 = '```{shift}{enter}codeblock2{shift}{enter}```{shift}{enter}';
        cy.apiLogin(testUser);
        cy.visit(`/${testTeam.name}/channels/${testChannel.name}`);
        cy.uiGetPostTextBox().type(messageWithCodeblock1).type('{enter}');
        cy.uiWaitUntilMessagePostedIncludes('codeblock1');
        cy.uiGetPostTextBox().type('{uparrow}');
        cy.get('#edit_textbox').clear().type(messageWithCodeblock2).type('{enter}');
        cy.uiWaitUntilMessagePostedIncludes('codeblock2');
    });
    it('MM-T1264 Arrow up key - Ephemeral message does not open for edit; opens previous regular message', () => {
        const message = 'Hello World';
        cy.postMessage(message);
        cy.postMessage('/code ');
        cy.findByText('(Only visible to you)').should('exist');
        cy.findByText('A message must be provided with the /code command.').should('exist');
        cy.get('body').type('{uparrow}');
        cy.get('#edit_textbox').should('be.visible');
        cy.get('#edit_textbox').should('have.value', message);
    });
    it('MM-T1270 UP - Edit message with attachment but no text', () => {
        cy.apiLogin(testUser);
        cy.visit(`/${testTeam.name}/channels/${testChannel.name}`);
        cy.get('#fileUploadInput').attachFile('mattermost-icon.png');
        cy.wait(TIMEOUTS.TWO_SEC);
        cy.uiGetPostTextBox().type('{enter}');
        cy.getLastPost().within(() => {
            cy.get('.file-view--single').should('exist');
            cy.get('.post-edited__indicator').should('not.exist');
        });
        cy.uiGetPostTextBox().type('{uparrow}');
        cy.get('#edit_textbox').type('Test');
        cy.wait(TIMEOUTS.ONE_SEC);
        cy.get('#edit_textbox').type('{enter}');
        cy.wait(TIMEOUTS.ONE_SEC);
        cy.getLastPost().within(() => {
            cy.get('.post-message__text').should('contain.text', 'Test');
            cy.get('.file-view--single').should('exist');
            cy.get('.post-edited__indicator').should('exist');
        });
    });
});