import messageMenusOptions from '../../../fixtures/interactive_message_menus_options.json';
import {getMessageMenusPayload} from '../../../utils';
import * as TIMEOUTS from '../../../fixtures/timeouts';
const options = [
    {text: 'Option 1', value: 'option1'},
    {text: 'Option 2', value: 'option2'},
    {text: 'Option 3', value: 'option3'},
];
describe('Interactive Menu', () => {
    let testUser;
    let otherUser;
    let longUser;
    let testChannel;
    let incomingWebhook;
    let teamId;
    before(() => {
        cy.requireWebhookServer();
        cy.apiInitSetup().then(({team, channel, user}) => {
            testUser = user;
            testChannel = channel;
            teamId = team.id;
            cy.apiCreateUser().then(({user: user2}) => {
                otherUser = user2;
                cy.apiAddUserToTeam(team.id, otherUser.id).then(() => {
                    cy.apiAddUserToChannel(testChannel.id, otherUser.id);
                });
            });
            const longUsername = 'with-long-username-abcdefghijklmnopqrstuvwxyz-123456789';
            cy.apiCreateUser({prefix: longUsername}).then(({user: user3}) => {
                longUser = user3;
                cy.apiAddUserToTeam(team.id, longUser.id).then(() => {
                    cy.apiAddUserToChannel(testChannel.id, longUser.id);
                });
            });
            const newIncomingHook = {
                channel_id: testChannel.id,
                channel_locked: true,
                description: 'Incoming webhook interactive menu',
                display_name: 'menuIn' + Date.now(),
            };
            cy.apiCreateWebhook(newIncomingHook).then((hook) => {
                incomingWebhook = hook;
            });
            cy.apiLogin(testUser);
            cy.visit(`/${team.name}/channels/${testChannel.name}`);
        });
    });
    it('matches elements', () => {
        const payload = getMessageMenusPayload({options});
        cy.postIncomingWebhook({url: incomingWebhook.url, data: payload, waitFor: 'attachment-pretext'});
        cy.getLastPostId().then((postId) => {
            cy.get(`#messageAttachmentList_${postId}`).as('messageAttachmentList');
        });
        cy.get('@messageAttachmentList').scrollIntoView().within(() => {
            cy.get('.attachment__thumb-pretext').should('be.visible').and('have.text', payload.attachments[0].pretext);
            cy.get('.post-message__text-container').should('be.visible').and('have.text', payload.attachments[0].text);
            cy.get('.attachment-actions').should('be.visible');
            cy.get('.select-suggestion-container').should('be.visible');
            cy.get('#suggestionList').should('not.exist');
            cy.findByPlaceholderText('Select an option...').scrollIntoView().should('be.visible').click();
            cy.get('#suggestionList').should('be.visible').children().should('have.length', options.length);
            cy.get('#suggestionList').children().each(($el, index) => {
                cy.wrap($el).should('have.text', options[index].text);
            });
        });
        cy.get('body').click();
    });
    it('MM-T1736 - Selected Option is displayed, Ephemeral message is posted', () => {
        const payload = getMessageMenusPayload({options});
        cy.postIncomingWebhook({url: incomingWebhook.url, data: payload, waitFor: 'attachment-pretext'});
        cy.getLastPostId().then((postId) => {
            cy.get(`#messageAttachmentList_${postId}`).within(() => {
                cy.findByPlaceholderText('Select an option...').scrollIntoView().click().clear({force: true}).type(`${options[0].text}{enter}`);
                cy.findByDisplayValue(options[0].text).should('exist');
            });
        });
        verifyEphemeralMessage('Ephemeral | select option: option1');
    });
    it('MM-T1737 - Reply is displayed in center channel with "commented on [user\'s] message: [text]"', () => {
        const payload = getMessageMenusPayload({options});
        cy.postIncomingWebhook({url: incomingWebhook.url, data: payload, waitFor: 'attachment-pretext'});
        cy.getLastPostId().then((parentMessageId) => {
            cy.postMessageAs({sender: otherUser, message: 'Just another message', channelId: testChannel.id});
            cy.clickPostCommentIcon(parentMessageId);
            cy.get('#rhsContainer').should('be.visible');
            cy.postMessageAs({sender: otherUser, message: 'Reply to webhook', channelId: testChannel.id, rootId: parentMessageId});
            cy.getLastPostId().then((replyMessageId) => {
                cy.get(`#post_${replyMessageId}`).within(() => {
                    cy.get('.post__link').should('be.visible').and('have.text', `Commented on sysadmin's message: ${payload.attachments[0].pretext}`);
                    cy.get(`#postMessageText_${replyMessageId}`).should('be.visible').and('have.text', 'Reply to webhook');
                });
                cy.get(`#rhsPost_${replyMessageId}`).within(() => {
                    cy.get('.post__link').should('not.exist');
                    cy.get(`#rhsPostMessageText_${replyMessageId}`).should('be.visible').and('have.text', 'Reply to webhook');
                });
                cy.uiCloseRHS();
            });
        });
    });
    it('MM-T1743 - Searching within the list of options', () => {
        const searchOptions = [
            {text: 'SearchOption1', value: 'searchoption1'},
            {text: 'SearchOption2', value: 'searchoption2'},
            ...options,
        ];
        const searchOptionsPayload = getMessageMenusPayload({options: searchOptions});
        cy.postIncomingWebhook({url: incomingWebhook.url, data: searchOptionsPayload, waitFor: 'attachment-pretext'});
        cy.getLastPostId().then((postId) => {
            cy.get(`#messageAttachmentList_${postId}`).as('messageAttachmentList');
        });
        cy.get('@messageAttachmentList').within(() => {
            cy.findByPlaceholderText('Select an option...').scrollIntoView().click().clear({force: true}).type('sea');
            cy.get('#suggestionList').should('exist').children().should('have.length', 2);
            cy.get('#suggestionList').within(() => {
                cy.findByText(searchOptions[0].text).should('exist');
                cy.findByText(searchOptions[1].text).should('exist');
            });
        });
    });
    it('MM-T1746 - No items match feedback', () => {
        const missingUser = Date.now();
        const userOptions = getMessageMenusPayload({dataSource: 'users'});
        cy.postIncomingWebhook({url: incomingWebhook.url, data: userOptions, waitFor: 'attachment-pretext'});
        cy.getLastPostId().then((postId) => {
            cy.get(`#messageAttachmentList_${postId}`).within(() => {
                cy.findByPlaceholderText('Select an option...').scrollIntoView().click().clear({force: true}).type(missingUser);
                cy.get('#suggestionList').within(() => {
                    cy.get('.suggestion-list__no-results').should('be.visible').should('have.text', `No items match ${missingUser}`);
                });
            });
        });
    });
    it('MM-T1742 - Using up/down arrow keys to make selection', () => {
        const basicOptions = getMessageMenusPayload({options});
        cy.postIncomingWebhook({url: incomingWebhook.url, data: basicOptions, waitFor: 'attachment-pretext'});
        cy.getLastPostId().then((postId) => {
            cy.get(`#messageAttachmentList_${postId}`).as('messageAttachmentList');
        });
        cy.get('@messageAttachmentList').within(() => {
            cy.findByPlaceholderText('Select an option...').scrollIntoView().as('optionInputField');
            cy.get('@optionInputField').click();
            cy.get('#suggestionList').should('be.visible');
            cy.get('@optionInputField').type('{downarrow}{downarrow}');
            cy.get('#suggestionList').within(() => {
                cy.get('.suggestion--selected').should('have.text', options[2].text);
            });
            cy.get('@optionInputField').type('{uparrow}{uparrow}');
            cy.get('#suggestionList').within(() => {
                cy.get('.suggestion--selected').should('have.text', options[0].text);
            });
        });
    });
    it('should truncate properly the selected long basic option', () => {
        const withLongBasicOption = [
            {text: 'Option 0 - This is with very long option', value: 'option0'},
            ...options,
        ];
        const basicOptions = getMessageMenusPayload({options: withLongBasicOption});
        cy.postIncomingWebhook({url: incomingWebhook.url, data: basicOptions, waitFor: 'attachment-pretext'}).then(() => {
            verifyLastPost();
        });
    });
    it('should truncate properly the selected long username option', () => {
        const userOptions = getMessageMenusPayload({dataSource: 'users'});
        cy.postIncomingWebhook({url: incomingWebhook.url, data: userOptions, waitFor: 'attachment-pretext'}).then(() => {
            verifyLastPost();
        });
    });
    it('should truncate properly the selected long channel display name option', () => {
        const channelOptions = getMessageMenusPayload({dataSource: 'channels'});
        cy.apiCreateChannel(teamId, 'test-channel', `AAAA Very Long Display Name of a Channel ${Date.now()}`).then(() => {
            cy.postIncomingWebhook({url: incomingWebhook.url, data: channelOptions, waitFor: 'attachment-pretext'}).then(() => {
                verifyLastPost();
            });
        });
    });
    it('MM-T1740 - Clicking in / Tapping on the message attachment menu box opens list of selections', () => {
        const basicOptionPayload = getMessageMenusPayload({options});
        cy.postIncomingWebhook({url: incomingWebhook.url, data: basicOptionPayload, waitFor: 'attachment-pretext'});
        cy.getLastPostId().then((lastPostId) => {
            cy.get(`#messageAttachmentList_${lastPostId}`).within(() => {
                cy.get('#suggestionList').should('not.exist');
                cy.findByPlaceholderText('Select an option...').scrollIntoView().click();
                cy.get('#suggestionList').should('exist').children().should('have.length', options.length);
                cy.get('#suggestionList').within(() => {
                    cy.findByText(options[0].text).should('exist');
                    cy.findByText(options[1].text).should('exist');
                    cy.findByText(options[2].text).should('exist');
                });
            });
            cy.get('body').click();
        });
    });
    it('MM-T1745 - Enter selects the option', () => {
        const distinctOptions = messageMenusOptions['distinct-options'];
        const distinctOptionsPayload = getMessageMenusPayload({options: distinctOptions});
        cy.postIncomingWebhook({url: incomingWebhook.url, data: distinctOptionsPayload, waitFor: 'attachment-pretext'});
        cy.getLastPostId().then((lastPostId) => {
            cy.get(`#messageAttachmentList_${lastPostId}`).within(() => {
                cy.findByPlaceholderText('Select an option...').scrollIntoView().as('optionInputField');
                cy.get('@optionInputField').click();
                cy.get('#suggestionList').should('exist').children().should('have.length', distinctOptions.length);
                const selectedOption = distinctOptions[5].text;
                cy.get('@optionInputField').type(selectedOption);
                cy.get('#suggestionList').within(() => {
                    cy.findByText(distinctOptions[0].text).should('not.exist');
                    cy.findByText(distinctOptions[1].text).should('not.exist');
                    cy.findByText(distinctOptions[2].text).should('not.exist');
                    cy.findByText(distinctOptions[3].text).should('not.exist');
                    cy.findByText(distinctOptions[4].text).should('not.exist');
                    cy.findByText(selectedOption).should('exist');
                    cy.findByText(distinctOptions[6].text).should('exist');
                });
                cy.get('@optionInputField').type('{enter}');
                cy.get('#suggestionList').should('not.exist');
                cy.findByDisplayValue(selectedOption).should('exist');
            });
        });
        verifyEphemeralMessage('Ephemeral | select option: mango');
    });
    it('MM-T1741 - Long lists of selections are scrollable', () => {
        const manyOptions = messageMenusOptions['many-options'];
        const manyOptionsPayload = getMessageMenusPayload({options: manyOptions});
        cy.postIncomingWebhook({url: incomingWebhook.url, data: manyOptionsPayload, waitFor: 'attachment-pretext'});
        cy.getLastPostId().then((lastPostId) => {
            cy.get(`#messageAttachmentList_${lastPostId}`).within(() => {
                cy.get('#suggestionList').should('not.exist');
                cy.findByPlaceholderText('Select an option...').scrollIntoView().click();
                cy.get('#suggestionList').should('exist').children().should('have.length', manyOptions.length);
                const lenghtOfLongListOptions = manyOptions.length;
                cy.get('#suggestionList').scrollTo('bottom').then((listContainer) => {
                    cy.findByText(manyOptions[0].text, {listContainer}).should('exist').and('not.be.visible');
                    cy.findByText(manyOptions[1].text, {listContainer}).should('exist').and('not.be.visible');
                    cy.findByText(manyOptions[lenghtOfLongListOptions - 1].text, {listContainer}).scrollIntoView().should('exist').and('be.visible');
                    cy.findByText(manyOptions[lenghtOfLongListOptions - 2].text, {listContainer}).scrollIntoView().should('exist').and('be.visible');
                });
                cy.get('#suggestionList').scrollTo('top').then((listContainer) => {
                    cy.findByText(manyOptions[lenghtOfLongListOptions - 1].text, {listContainer}).should('not.be.visible');
                    cy.findByText(manyOptions[lenghtOfLongListOptions - 2].text, {listContainer}).should('not.be.visible');
                    cy.findByText(manyOptions[0].text, {listContainer}).should('be.visible');
                    cy.findByText(manyOptions[1].text, {listContainer}).should('be.visible');
                });
            });
            cy.get('body').click();
        });
    });
    it('MM-T1747 - Selection is mirrored in RHS / Message Thread', () => {
        const distinctOptions = messageMenusOptions['distinct-options'];
        const distinctListOptionPayload = getMessageMenusPayload({options: distinctOptions});
        cy.postIncomingWebhook({url: incomingWebhook.url, data: distinctListOptionPayload, waitFor: 'attachment-pretext'});
        const selectedItem = distinctOptions[2].text;
        const firstFewLettersOfSelectedItem = selectedItem.substring(0, 3);
        cy.getLastPostId().then((lastPostId) => {
            cy.get(`#messageAttachmentList_${lastPostId}`).within(() => {
                cy.findByPlaceholderText('Select an option...').scrollIntoView().clear({force: true}).type(firstFewLettersOfSelectedItem).wait(TIMEOUTS.ONE_SEC);
                cy.get('#suggestionList').should('exist').within(() => {
                    cy.findByText(selectedItem).should('exist');
                });
                cy.findByPlaceholderText('Select an option...').scrollIntoView().type('{enter}');
                cy.findByDisplayValue(selectedItem).should('exist');
            });
        });
        verifyEphemeralMessage('Ephemeral | select option: banana');
        cy.getNthPostId(-2).then((webhookMessageId) => {
            cy.clickPostCommentIcon(webhookMessageId);
            cy.get('#rhsContainer').should('exist');
            cy.get(`#rhsPost_${webhookMessageId}`).within(() => {
                cy.findByDisplayValue(selectedItem).should('exist');
            });
            cy.uiCloseRHS();
        });
    });
    it('MM-T1748 - Change selection in RHS / Message Thread', () => {
        const distinctOptions = messageMenusOptions['distinct-options'];
        const distinctListOptionPayload = getMessageMenusPayload({options: distinctOptions});
        cy.postIncomingWebhook({url: incomingWebhook.url, data: distinctListOptionPayload, waitFor: 'attachment-pretext'});
        const firstSelectedItem = distinctOptions[2].text;
        const secondSelectedItem = distinctOptions[7].text;
        cy.getLastPostId().then((parentPostId) => {
            cy.get(`#messageAttachmentList_${parentPostId}`).within(() => {
                cy.findByPlaceholderText('Select an option...').scrollIntoView().click();
                cy.get('#suggestionList').should('exist').within(() => {
                    cy.findByText(firstSelectedItem).should('exist').click();
                });
                cy.findByDisplayValue(firstSelectedItem).should('exist');
            });
            verifyEphemeralMessage('Ephemeral | select option: banana');
            cy.clickPostCommentIcon(parentPostId);
            cy.get('#rhsContainer').should('exist');
            cy.get(`#rhsPost_${parentPostId}`).within(() => {
                cy.findByDisplayValue(firstSelectedItem).should('exist').click();
                cy.get('#suggestionList').should('exist').within(() => {
                    cy.findByText(secondSelectedItem).should('exist').click();
                });
                cy.findByDisplayValue(secondSelectedItem).should('exist');
            });
            cy.get(`#messageAttachmentList_${parentPostId}`).within(() => {
                cy.findByDisplayValue(secondSelectedItem).should('exist');
            });
            verifyEphemeralMessage('Ephemeral | select option: avocado');
            cy.uiCloseRHS();
        });
    });
    it('MM-T1738 - Selected options with long usernames are not cut off in the RHS', () => {
        const userOptions = getMessageMenusPayload({dataSource: 'users'});
        cy.postIncomingWebhook({url: incomingWebhook.url, data: userOptions, waitFor: 'attachment-pretext'});
        cy.getLastPostId().then((lastPostId) => {
            cy.get(`#messageAttachmentList_${lastPostId}`).within(() => {
                cy.findByPlaceholderText('Select an option...').scrollIntoView().clear({force: true}).type(longUser.username);
                cy.get('#suggestionList').within(() => {
                    cy.findByText(`@${longUser.username}`).should('exist').click({force: true});
                });
                cy.findByDisplayValue(longUser.username).should('exist');
            });
            cy.clickPostCommentIcon(lastPostId);
            cy.get('#rhsContainer').should('exist');
            cy.get(`#rhsPost_${lastPostId}`).within(() => {
                cy.findByDisplayValue(longUser.username).should('exist').and('have.css', 'text-overflow', 'ellipsis');
            });
            cy.uiCloseRHS();
        });
    });
});
function verifyMessageAttachmentList(postId, isRhs, text) {
    cy.get(`#messageAttachmentList_${postId}`).within(() => {
        cy.findByTestId('autoCompleteSelector').should('be.visible');
        if (isRhs) {
            cy.findByPlaceholderText('Select an option...').scrollIntoView().should('have.value', text);
        } else {
            cy.findByPlaceholderText('Select an option...').scrollIntoView().should('be.visible').click();
            cy.get('#suggestionList').should('be.visible').children().first().click({force: true});
        }
        cy.get('.select-suggestion-container').
            should('be.visible').
            and('have.css', 'height', '32px').
            and('have.css', 'width', '220px');
        cy.findByPlaceholderText('Select an option...').scrollIntoView().
            and('have.css', 'height', '32px').
            and('have.css', 'width', '220px').
            and('have.css', 'padding-right', '30px');
        cy.findByPlaceholderText('Select an option...').scrollIntoView().invoke('attr', 'value').then((value) => {
            cy.wrap(value).as('optionValue');
        });
    });
}
function verifyLastPost() {
    cy.getLastPostId().then((postId) => {
        verifyMessageAttachmentList(postId, false);
        cy.clickPostCommentIcon(postId);
        cy.get(`#rhsPost_${postId}`).within(() => {
            cy.get('@optionValue').then((value) => {
                verifyMessageAttachmentList(postId, true, value);
            });
        });
        cy.uiCloseRHS();
    });
}
function verifyEphemeralMessage(message) {
    cy.wait(TIMEOUTS.HALF_SEC).getLastPostId().then((botLastPostId) => {
        cy.get(`#post_${botLastPostId}`).within(() => {
            cy.findByText('(Only visible to you)').should('exist');
            cy.findByText(message).should('exist');
        });
    });
}