import * as TIMEOUTS from '../../../fixtures/timeouts';
import * as MESSAGES from '../../../fixtures/messages';
import {isMac, getRandomId} from '../../../utils';
describe('Messaging', () => {
    let testTeam;
    let testUser;
    let otherUser;
    const firstMessage = 'Hello';
    const message1 = 'message1';
    const message2 = 'message2';
    const messageX = 'messageX';
    const messageWithCodeblock1 = '```{shift}{enter}codeblock1{shift}{enter}```{shift}{enter}';
    const messageWithCodeblockTextOnly1 = 'codeblock1';
    const messageWithCodeblockIncomplete2 = '```{shift}{enter}codeblock2';
    const messageWithCodeblockTextOnly2 = 'codeblock2';
    const messageWithCodeblockIncomplete3 = '```{shift}{enter}codeblock3';
    const messageWithCodeblockTextOnly3 = 'codeblock3';
    before(() => {
        let offTopicUrl;
        cy.apiInitSetup().then(({team, user}) => {
            testTeam = team;
            testUser = user;
            offTopicUrl = `/${team.name}/channels/off-topic`;
        });
        cy.apiCreateUser().then(({user: user1}) => {
            otherUser = user1;
            cy.apiAddUserToTeam(testTeam.id, otherUser.id);
        }).then(() => {
            cy.apiLogin(testUser);
            cy.visit(offTopicUrl);
        });
    });
    beforeEach(() => {
        cy.apiLogin(testUser);
        cy.uiGetPostTextBox().type(firstMessage).type('{enter}').wait(TIMEOUTS.HALF_SEC);
    });
    it('MM-T210 Center channel input box doesn\'t overlap with RHS', () => {
        cy.viewport('ipad-2');
        const maxReplyCount = 15;
        cy.uiGetPostTextBox().should('be.focused');
        cy.getLastPostId().then((postId) => {
            cy.clickPostCommentIcon(postId);
        });
        cy.uiGetPostTextBox().should('not.be.focused');
        cy.uiGetReplyTextBox().clear().should('be.visible').as('replyTextBox');
        for (let i = 1; i <= maxReplyCount; i++) {
            cy.get('@replyTextBox').type(`post ${i}`).type('{enter}');
        }
        cy.uiGetReply().should('be.visible');
        cy.viewport(1280, 900);
    });
    it('MM-T712 Editing a post with Ctrl+Enter on for all messages configured', () => {
        setSendMessagesOnCtrlEnter('On for all messages');
        cy.uiGetPostTextBox().type(message1).type('{enter}').wait(TIMEOUTS.HALF_SEC);
        cy.getLastPostId().then((postId) => {
            cy.get(`#postMessageText_${postId}`).should('not.contain', message1);
        });
        cy.typeCmdOrCtrl().type('{enter}').wait(TIMEOUTS.HALF_SEC);
        cy.getLastPostId().then((postId) => {
            cy.get(`#postMessageText_${postId}`).should('contain', message1);
        });
        cy.getLastPostId().then(() => {
            cy.uiGetPostTextBox().type('{uparrow}');
            cy.get('#edit_textbox').should('be.visible');
            cy.get('#edit_textbox').clear().type(message2);
            cy.get('#edit_textbox').type('{enter}').wait(TIMEOUTS.HALF_SEC);
            cy.get('#edit_textbox').should('be.visible');
            cy.typeCmdOrCtrlForEdit().type('{enter}').wait(TIMEOUTS.HALF_SEC);
        });
        cy.uiGetPostTextBox().should('be.visible').clear().type(`${messageWithCodeblock1}{enter}`).wait(TIMEOUTS.HALF_SEC);
        cy.getLastPostId().then((postId) => {
            cy.get(`#postMessageText_${postId}`).should('not.contain', messageWithCodeblockTextOnly1);
        });
        cy.typeCmdOrCtrl().type('{enter}').wait(TIMEOUTS.HALF_SEC);
        cy.getLastPostId().then((postId) => {
            cy.get(`#postMessageText_${postId}`).should('contain', messageWithCodeblockTextOnly1);
        });
        cy.getLastPostId().then(() => {
            cy.uiGetPostTextBox().type('{uparrow}');
            cy.get('#edit_textbox').should('be.visible');
            cy.get('#edit_textbox').invoke('val', '').type(messageWithCodeblock1).type('{enter}').wait(TIMEOUTS.HALF_SEC);
            cy.get('#edit_textbox').should('be.visible');
            cy.typeCmdOrCtrlForEdit().type('{enter}').wait(TIMEOUTS.HALF_SEC);
        });
        cy.uiGetPostTextBox().should('be.visible').clear().type(`${messageWithCodeblockIncomplete2}{enter}`).wait(TIMEOUTS.HALF_SEC);
        cy.getLastPostId().then((postId) => {
            cy.get(`#postMessageText_${postId}`).should('not.contain', messageWithCodeblockTextOnly2);
        });
        cy.typeCmdOrCtrl().type('{enter}').wait(TIMEOUTS.HALF_SEC);
        cy.getLastPostId().then((postId) => {
            cy.get(`#postMessageText_${postId}`).should('contain', messageWithCodeblockTextOnly2);
        });
        cy.getLastPostId().then(() => {
            cy.uiGetPostTextBox().type('{uparrow}');
            cy.get('#edit_textbox').should('be.visible');
            cy.get('#edit_textbox').invoke('val', '').type(messageWithCodeblockIncomplete2).type('{enter}').wait(TIMEOUTS.HALF_SEC);
            cy.get('#edit_textbox').should('be.visible');
            cy.typeCmdOrCtrlForEdit().type('{enter}').wait(TIMEOUTS.HALF_SEC);
        });
        cy.uiGetPostTextBox().should('be.visible').clear().type(`${messageWithCodeblockIncomplete3}{leftArrow}{leftArrow}{leftArrow}{enter}`).wait(TIMEOUTS.HALF_SEC);
        cy.getLastPostId().then((postId) => {
            cy.get(`#postMessageText_${postId}`).should('not.contain', messageWithCodeblockTextOnly3);
        });
        cy.uiGetPostTextBox().should('be.visible').clear().type(`${messageWithCodeblockIncomplete3}{leftArrow}{leftArrow}{leftArrow}`).wait(TIMEOUTS.HALF_SEC);
        cy.typeCmdOrCtrl().type('{enter}').wait(TIMEOUTS.HALF_SEC);
        cy.getLastPostId().then((postId) => {
            cy.get(`#postMessageText_${postId}`).should('contain', messageWithCodeblockTextOnly3);
        });
        cy.getLastPostId().then(() => {
            cy.uiGetPostTextBox().type('{uparrow}');
            cy.get('#edit_textbox').should('be.visible');
            cy.get('#edit_textbox').invoke('val', '').type(`${messageWithCodeblockIncomplete3}{leftArrow}{leftArrow}{leftArrow}{enter}`).wait(TIMEOUTS.HALF_SEC);
            cy.get('#edit_textbox').should('be.visible');
            cy.get('#edit_textbox').invoke('val', '').type(`${messageWithCodeblockIncomplete3}{leftArrow}{leftArrow}{leftArrow}`);
            cy.typeCmdOrCtrlForEdit().type('{enter}');
        });
        cy.getLastPostId().then((postId) => {
            cy.get(`#postMessageText_${postId}`).should('contain', messageWithCodeblockTextOnly3);
        });
    });
    it('MM-T3448 Editing a post with Ctrl+Enter only for code blocks starting with ``` configured', () => {
        setSendMessagesOnCtrlEnter('On only for code blocks starting with ```');
        cy.uiGetPostTextBox().type(message1).type('{enter}').wait(TIMEOUTS.HALF_SEC);
        cy.getLastPostId().then((postId) => {
            cy.get(`#postMessageText_${postId}`).should('contain', message1);
        });
        cy.getLastPostId().then((postId) => {
            const message = `message ${getRandomId()}`;
            cy.editLastPostWithNewMessage(message);
            cy.get(`#postMessageText_${postId}`).should('contain', message);
        });
        cy.uiGetPostTextBox().should('be.visible').clear().type(messageWithCodeblock1).wait(TIMEOUTS.HALF_SEC);
        cy.uiGetPostTextBox().type('{enter}');
        cy.getLastPostId().then((postId) => {
            cy.get(`#postMessageText_${postId}`).should('contain', messageWithCodeblockTextOnly1);
        });
        cy.getLastPostId().then((postId) => {
            cy.editLastPostWithNewMessage(messageWithCodeblock1);
            cy.get(`#postMessageText_${postId}`).should('contain', messageWithCodeblockTextOnly1);
        });
        cy.uiGetPostTextBox().clear().type(messageWithCodeblockIncomplete2).wait(TIMEOUTS.HALF_SEC);
        cy.uiGetPostTextBox().type('{enter}');
        cy.getLastPostId().then((postId) => {
            cy.get(`#postMessageText_${postId}`).should('not.contain', messageWithCodeblockTextOnly2);
        });
        cy.typeCmdOrCtrl().type('{enter}');
        cy.getLastPostId().then((postId) => {
            cy.get(`#postMessageText_${postId}`).should('contain', messageWithCodeblockTextOnly2);
        });
        cy.getLastPostId().then(() => {
            cy.uiGetPostTextBox().type('{uparrow}');
            cy.get('#edit_textbox').should('be.visible');
            cy.get('#edit_textbox').invoke('val', '').type(messageWithCodeblockIncomplete2).type('{enter}').wait(TIMEOUTS.HALF_SEC);
            cy.get('#edit_textbox').should('be.visible');
            cy.typeCmdOrCtrlForEdit().type('{enter}').wait(TIMEOUTS.HALF_SEC);
        });
        cy.getLastPostId().then((postId) => {
            cy.get(`#postMessageText_${postId}`).should('contain', messageWithCodeblockTextOnly2);
        });
        cy.uiGetPostTextBox().clear().type(`${messageWithCodeblockIncomplete3}{leftArrow}{leftArrow}{leftArrow}{enter}`).wait(TIMEOUTS.HALF_SEC);
        cy.getLastPostId().then((postId) => {
            cy.get(`#postMessageText_${postId}`).should('not.contain', messageWithCodeblockTextOnly3);
        });
        cy.uiGetPostTextBox().clear().type(`${messageWithCodeblockIncomplete3}{leftArrow}{leftArrow}{leftArrow}`).wait(TIMEOUTS.HALF_SEC);
        cy.typeCmdOrCtrl().type('{enter}');
        cy.getLastPostId().then((postId) => {
            cy.get(`#postMessageText_${postId}`).should('contain', messageWithCodeblockTextOnly3);
        });
        cy.getLastPostId().then(() => {
            cy.uiGetPostTextBox().type('{uparrow}');
            cy.get('#edit_textbox').should('be.visible');
            cy.get('#edit_textbox').invoke('val', '').type(`${messageWithCodeblockIncomplete3}{leftArrow}{leftArrow}{leftArrow}`).wait(TIMEOUTS.HALF_SEC);
            cy.get('#edit_textbox').type('{enter}');
            cy.get('#edit_textbox').should('be.visible');
            cy.get('#edit_textbox').invoke('val', '').type(`${messageWithCodeblockIncomplete3}{leftArrow}{leftArrow}{leftArrow}`).wait(TIMEOUTS.HALF_SEC);
            cy.typeCmdOrCtrlForEdit().type('{enter}').wait(TIMEOUTS.HALF_SEC);
        });
        cy.getLastPostId().then((postId) => {
            cy.get(`#postMessageText_${postId}`).should('contain', messageWithCodeblockTextOnly3);
        });
    });
    it('MM-T3449 Editing a post with Ctrl+Enter off for code blocks configured', () => {
        setSendMessagesOnCtrlEnter('Off');
        cy.uiGetPostTextBox().type(message1).wait(TIMEOUTS.HALF_SEC);
        cy.uiGetPostTextBox().type('{enter}');
        cy.getLastPostId().then((postId) => {
            cy.get(`#postMessageText_${postId}`).should('contain', message1);
        });
        cy.getLastPostId().then((postId) => {
            cy.editLastPostWithNewMessage(message2);
            cy.get(`#postMessageText_${postId}`).should('contain', message2);
        });
        cy.uiGetPostTextBox().should('be.visible').clear().type(messageWithCodeblock1).wait(TIMEOUTS.HALF_SEC);
        cy.uiGetPostTextBox().type('{enter}').wait(TIMEOUTS.HALF_SEC);
        cy.getLastPostId().then((postId) => {
            cy.get(`#postMessageText_${postId}`).should('contain', messageWithCodeblockTextOnly1);
        });
        cy.getLastPostId().then((postId) => {
            cy.editLastPostWithNewMessage(messageWithCodeblock1);
            cy.get(`#postMessageText_${postId}`).should('contain', messageWithCodeblockTextOnly1);
        });
        cy.uiGetPostTextBox().clear().type(messageWithCodeblockIncomplete2).wait(TIMEOUTS.HALF_SEC);
        cy.uiGetPostTextBox().type('{enter}').wait(TIMEOUTS.HALF_SEC);
        cy.getLastPostId().then((postId) => {
            cy.editLastPostWithNewMessage(messageWithCodeblockIncomplete2);
            cy.get(`#postMessageText_${postId}`).should('contain', messageWithCodeblockTextOnly2);
        });
        cy.uiGetPostTextBox().clear().type(`${messageWithCodeblockIncomplete3}{leftArrow}{leftArrow}{leftArrow}`).wait(TIMEOUTS.HALF_SEC);
        cy.uiGetPostTextBox().type('{enter}');
        cy.getLastPostId().then((postId) => {
            cy.get(`#postMessageText_${postId}`).should('contain', messageWithCodeblockTextOnly3);
        });
        cy.getLastPostId().then((postId) => {
            cy.editLastPostWithNewMessage(`${messageWithCodeblockIncomplete3}{leftArrow}{leftArrow}{leftArrow}`);
            cy.get(`#postMessageText_${postId}`).should('contain', messageWithCodeblockTextOnly3);
        });
    });
    it('MM-T2139 Canceling out of editing a message makes no changes - Center', () => {
        cy.postMessage(message1);
        cy.getLastPostId().then((postId) => {
            cy.uiClickPostDropdownMenu(postId, 'Edit');
            cy.get('#edit_textbox').should('be.visible').wait(TIMEOUTS.ONE_SEC);
            cy.get('#edit_textbox').type('{enter}');
            cy.get('#edit_textbox').should('not.exist');
            cy.get(`#postMessageText_${postId}`).should('contain', message1).and('not.contain', 'Edited');
        });
    });
    it('MM-T2140 Edited message displays edits and "Edited" in center and RHS', () => {
        cy.viewport('iphone-6');
        cy.reload();
        cy.uiGetPostTextBox().type(message1).type('{enter}').wait(TIMEOUTS.HALF_SEC);
        cy.getLastPostId().then((postId) => {
            cy.clickPostDotMenu(postId);
            cy.get(`#edit_post_${postId}`).scrollIntoView().should('be.visible').click();
            cy.get('#edit_textbox').should('be.visible');
            cy.get('#edit_textbox', {timeout: TIMEOUTS.FIVE_SEC}).type(message2).wait(TIMEOUTS.HALF_SEC).type('{enter}');
        });
        cy.getLastPostId().then((postId) => {
            cy.get(`#post_${postId}`).within((el) => {
                cy.wrap(el).find('.post-edited__indicator').should('have.text', 'Edited');
            });
            cy.clickPostCommentIcon(postId);
            cy.get('#rhsContainer').should('be.visible').within(() => {
                cy.get(`#rhsPost_${postId}`).within((el) => {
                    cy.wrap(el).find('.post-edited__indicator').should('have.text', 'Edited');
                });
            });
        });
        cy.viewport(1280, 900);
        cy.uiGetPostTextBox().type(message1).type('{enter}').wait(TIMEOUTS.HALF_SEC);
        cy.getLastPostId().then((postId) => {
            cy.clickPostCommentIcon(postId);
        });
        cy.getLastPostId().then((postId) => {
            cy.clickPostDotMenu(postId, 'RHS_ROOT');
            cy.get(`#edit_post_${postId}`).scrollIntoView().should('be.visible').click();
            cy.get('#edit_textbox').should('be.visible');
            cy.get('#edit_textbox', {timeout: TIMEOUTS.FIVE_SEC}).type(message2).wait(TIMEOUTS.HALF_SEC).type('{enter}');
        });
        cy.getLastPostId().then((postId) => {
            cy.get(`#post_${postId}`).within((el) => {
                cy.wrap(el).find('.post-edited__indicator').should('have.text', 'Edited');
            });
            cy.get('#rhsContainer').should('be.visible').within(() => {
                cy.get(`#rhsPost_${postId}`).within((el) => {
                    cy.wrap(el).find('.post-edited__indicator').should('have.text', 'Edited');
                });
            });
        });
    });
    it('MM-T2141 Edit non-list to be numbered list', () => {
        const messageText = 'Post';
        const numberedListTextPart1Prefix = '1. ';
        const numberedListTextPart1 = 'One';
        const numberedListTextPart2Prefix = '2. ';
        const numberedListTextPart2 = new Array(32).fill('Two').join(' ');
        cy.uiGetPostTextBox().type(messageText).type('{enter}').wait(TIMEOUTS.HALF_SEC);
        cy.getLastPostId().then((postId) => {
            cy.clickPostDotMenu(postId);
            cy.get(`#edit_post_${postId}`).scrollIntoView().should('be.visible').click();
            cy.get('#edit_textbox').should('be.visible');
            cy.get('#edit_textbox', {timeout: TIMEOUTS.HALF_SEC}).invoke('val', '').type(numberedListTextPart1Prefix + numberedListTextPart1).type('{shift}{enter}').type(numberedListTextPart2Prefix + numberedListTextPart2).wait(TIMEOUTS.HALF_SEC);
            cy.get('#edit_textbox', {timeout: TIMEOUTS.FIVE_SEC}).type('{enter}');
        });
        cy.getLastPostId().then(() => {
            cy.get('ol.markdown__list').should('be.visible').within(() => {
                cy.contains(numberedListTextPart1);
                cy.contains(numberedListTextPart2);
            });
        });
    });
    it('MM-T2142 Edit code block', () => {
        const codeBlockMessage = '    test';
        const updateMessageText = ' update';
        cy.uiGetPostTextBox().type(codeBlockMessage).type('{enter}').wait(TIMEOUTS.HALF_SEC);
        cy.getLastPostId().then((postId) => {
            cy.clickPostDotMenu(postId);
            cy.get(`#edit_post_${postId}`).scrollIntoView().should('be.visible').click();
            cy.get('#edit_textbox').should('be.visible');
            cy.get('#edit_textbox', {timeout: TIMEOUTS.FIVE_SEC}).type(updateMessageText).wait(TIMEOUTS.HALF_SEC);
            cy.get('#edit_textbox', {timeout: TIMEOUTS.FIVE_SEC}).type('{enter}');
        });
        cy.getLastPostId().then((postId) => {
            cy.get(`#post_${postId}`).within((el) => {
                cy.wrap(el).find('.post-code.post-code--wrap').should('have.text', 'test update');
                cy.wrap(el).find('.post-edited__indicator').should('have.text', 'Edited');
            });
        });
    });
    it('MM-T2144 Up arrow, edit', () => {
        cy.uiGetPostTextBox().type(message1).type('{enter}').wait(TIMEOUTS.HALF_SEC);
        cy.getLastPostId().then(() => {
            cy.uiGetPostTextBox().type('{uparrow}');
            cy.get('#edit_textbox').should('be.visible');
            cy.get('#edit_textbox', {timeout: TIMEOUTS.FIVE_SEC}).invoke('val', '').type(message2).wait(TIMEOUTS.HALF_SEC);
            cy.get('#edit_textbox', {timeout: TIMEOUTS.FIVE_SEC}).type('{enter}');
        });
        cy.getLastPostId().then((postId) => {
            cy.get(`#post_${postId}`).within((el) => {
                cy.wrap(el).findByText(message2).should('be.visible');
                cy.wrap(el).find('.post-edited__indicator').should('have.text', 'Edited');
            });
        });
    });
    it('MM-T2145 Other user sees "Edited"', () => {
        cy.uiGetPostTextBox().type(message1).type('{enter}').wait(TIMEOUTS.HALF_SEC);
        cy.getLastPostId().then(() => {
            cy.uiGetPostTextBox().type('{uparrow}');
            cy.get('#edit_textbox').should('be.visible');
            cy.get('#edit_textbox', {timeout: TIMEOUTS.FIVE_SEC}).type(message2).wait(TIMEOUTS.HALF_SEC);
            cy.get('#edit_textbox', {timeout: TIMEOUTS.FIVE_SEC}).type('{enter}');
        });
        cy.apiLogin(otherUser);
        cy.getLastPostId().then((postId) => {
            cy.get(`#post_${postId}`).within((el) => {
                cy.wrap(el).find('.post-edited__indicator').should('have.text', 'Edited');
            });
            cy.clickPostCommentIcon(postId);
            cy.get('#rhsContainer').should('be.visible').within(() => {
                cy.get(`#rhsPost_${postId}`).within((el) => {
                    cy.wrap(el).find('.post-edited__indicator').should('have.text', 'Edited');
                });
            });
        });
    });
    it('MM-T2149 Edit a message in search results RHS', () => {
        cy.postMessage(messageX);
        cy.getLastPostId().then((postId) => {
            cy.uiGetSearchContainer().click();
            cy.uiGetSearchBox().should('be.visible').type(messageX).type('{enter}').wait(TIMEOUTS.HALF_SEC);
            cy.clickPostDotMenu(postId, 'SEARCH');
            cy.get(`#SEARCH_dropdown_${postId}`).should('be.visible').within(() => {
                cy.findByText('Edit').click();
            });
            cy.get('#edit_textbox').should('be.visible');
            cy.get('#edit_textbox', {timeout: TIMEOUTS.FIVE_SEC}).invoke('val', '').type(message2).wait(TIMEOUTS.HALF_SEC).type('{enter}').wait(TIMEOUTS.HALF_SEC);
            cy.get(`#searchResult_${postId}`).findByText('Edited').should('exist');
            cy.get(`#post_${postId}`).within((el) => {
                cy.wrap(el).find('.post-edited__indicator').should('have.text', 'Edited');
            });
            cy.findAllByLabelText('Close').should('be.visible').first().click();
        });
    });
    it('MM-T2152 Edit long message - edit box expands to larger size', () => {
        cy.uiGetPostTextBox().
            clear().
            invoke('val', MESSAGES.HUGE).
            wait(TIMEOUTS.HALF_SEC).
            type(' {backspace}{enter}');
        cy.getLastPostId().then((postId) => {
            cy.clickPostDotMenu(postId);
            cy.get(`#edit_post_${postId}`).scrollIntoView().should('be.visible').click();
            cy.get('#edit_textbox').should('be.visible');
            cy.get('#edit_textbox', {timeout: TIMEOUTS.FIVE_SEC}).type(' test').wait(TIMEOUTS.HALF_SEC);
            cy.get('#edit_textbox', {timeout: TIMEOUTS.FIVE_SEC}).type('{enter}');
        });
        cy.getLastPostId().then((postId) => {
            cy.get(`#post_${postId}`).within((el) => {
                cy.wrap(el).find('.post-edited__indicator').should('have.text', 'Edited');
            });
        });
    });
    it('MM-T2204 @ autocomplete from within edit modal', () => {
        cy.uiGetPostTextBox().type(message1).type('{enter}').wait(TIMEOUTS.HALF_SEC);
        cy.getLastPostId().then((postId) => {
            cy.clickPostDotMenu(postId);
            cy.get(`#edit_post_${postId}`).scrollIntoView().should('be.visible').click();
            cy.get('#edit_textbox').should('be.visible');
            cy.get('#edit_textbox', {timeout: TIMEOUTS.FIVE_SEC}).type(' @sy').wait(TIMEOUTS.HALF_SEC);
            cy.get('#suggestionList').within(() => {
                cy.findByText('@sysadmin').should('be.visible').click();
            });
            cy.get('#edit_textbox', {timeout: TIMEOUTS.FIVE_SEC}).type('{enter}');
        });
    });
});
function setSendMessagesOnCtrlEnter(name) {
    cy.uiOpenSettingsModal('Advanced').within(() => {
        cy.findByRole('heading', {name: `Send Messages on ${isMac() ? '⌘+ENTER' : 'CTRL+ENTER'}`}).should('be.visible').click();
        cy.findByRole('radio', {name}).click();
        cy.uiSaveAndClose();
    });
}