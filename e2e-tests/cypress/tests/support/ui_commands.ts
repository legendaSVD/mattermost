import localforage from 'localforage';
import * as TIMEOUTS from '../fixtures/timeouts';
import {ChainableT} from '../types';
import {isMac} from '../utils';
function logout(): ChainableT<any> {
    return cy.get('#logout').click({force: true});
}
Cypress.Commands.add('logout', logout);
function getCurrentUserId(): ChainableT<Promise<unknown>> {
    return cy.wrap(new Promise((resolve) => {
        cy.getCookie('MMUSERID').then((cookie) => {
            resolve(cookie.value);
        });
    }));
}
Cypress.Commands.add('getCurrentUserId', getCurrentUserId);
function typeCmdOrCtrl(): ChainableT<any> {
    return typeCmdOrCtrlInt('#post_textbox');
}
Cypress.Commands.add('typeCmdOrCtrl', typeCmdOrCtrl);
function typeCmdOrCtrlForEdit(): ChainableT<any> {
    return typeCmdOrCtrlInt('#edit_textbox');
}
Cypress.Commands.add('typeCmdOrCtrlForEdit', typeCmdOrCtrlForEdit);
function typeCmdOrCtrlInt(textboxSelector: string) {
    let cmdOrCtrl: string;
    if (isMac()) {
        cmdOrCtrl = '{cmd}';
    } else {
        cmdOrCtrl = '{ctrl}';
    }
    return cy.get(textboxSelector).type(cmdOrCtrl, {release: false});
}
function cmdOrCtrlShortcut(subject: string, text?: string): ChainableT<any> {
    const cmdOrCtrl = isMac() ? '{cmd}' : '{ctrl}';
    return cy.get(subject).type(`${cmdOrCtrl}${text}`);
}
Cypress.Commands.add('cmdOrCtrlShortcut', {prevSubject: true}, cmdOrCtrlShortcut);
function postMessage(message: string): ChainableT<any> {
    cy.get('#postListContent').should('be.visible');
    return postMessageAndWait('#post_textbox', message);
}
Cypress.Commands.add('postMessage', postMessage);
function postMessageReplyInRHS(message: string): ChainableT<any> {
    cy.get('#sidebar-right').should('be.visible');
    return postMessageAndWait('#reply_textbox', message, true);
}
Cypress.Commands.add('postMessageReplyInRHS', postMessageReplyInRHS);
Cypress.Commands.add('uiPostMessageQuickly', (message) => {
    cy.uiGetPostTextBox().should('be.visible').clear().
        invoke('val', message).wait(TIMEOUTS.HALF_SEC).type(' {backspace}{enter}');
    cy.waitUntil(() => {
        return cy.uiGetPostTextBox().then((el) => {
            return el[0].textContent === '';
        });
    });
});
function postMessageAndWait(textboxSelector: string, message: string, isComment = false) {
    cy.wait(TIMEOUTS.HALF_SEC);
    cy.get(textboxSelector, {timeout: TIMEOUTS.HALF_MIN}).should('be.visible');
    cy.get(textboxSelector).clear().type(message).wait(TIMEOUTS.ONE_SEC);
    if (isComment) {
        waitForCommentDraft(message);
    }
    cy.get(textboxSelector).should('have.value', message).focus().type('{enter}').wait(TIMEOUTS.HALF_SEC);
    cy.get(textboxSelector).invoke('val').then((value: string) => {
        if (value.length > 0 && value === message) {
            cy.get(textboxSelector).type('{enter}').wait(TIMEOUTS.HALF_SEC);
        }
    });
    return cy.waitUntil(() => {
        return cy.get(textboxSelector).then((el) => {
            return el[0].textContent === '';
        });
    });
}
interface Draft {
    value?: {
        message?: string;
    };
}
function waitForCommentDraft(message: string) {
    const draftPrefix = 'comment_draft_';
    cy.waitUntil(async () => {
        const keys = await localforage.keys();
        const draftPromises = keys.
            filter((key) => key.includes(draftPrefix)).
            map((key) => localforage.getItem(key));
        const draftItems = await Promise.all(draftPromises) as string[];
        const commentDraft = draftItems.filter((item) => {
            const draft: Draft = JSON.parse(item);
            if (draft && draft.value && draft.value.message) {
                return draft.value.message === message;
            }
            return false;
        });
        return Boolean(commentDraft);
    });
}
function waitUntilPermanentPost() {
    cy.wait(TIMEOUTS.HALF_SEC);
    cy.get('#postListContent', {timeout: TIMEOUTS.ONE_MIN}).should('be.visible');
    return cy.waitUntil(() => cy.findAllByTestId('postView').last().then((el) => !(el[0].id.includes(':'))));
}
function getLastPost(): ChainableT<JQuery> {
    waitUntilPermanentPost();
    return cy.findAllByTestId('postView').last();
}
Cypress.Commands.add('getLastPost', getLastPost);
function getLastPostId(): ChainableT<string> {
    waitUntilPermanentPost();
    return cy.findAllByTestId('postView').last().should('have.attr', 'id').and('not.include', ':').
        invoke('replace', /^[^_]*_/, '');
}
Cypress.Commands.add('getLastPostId', getLastPostId);
function uiWaitUntilMessagePostedIncludes(message: string): ChainableT<any> {
    const checkFn = () => {
        return cy.getLastPost().scrollIntoView().then((el) => {
            const postedMessageEl = el.find('.post-message__text')[0];
            return Boolean(postedMessageEl && postedMessageEl.textContent.includes(message));
        });
    };
    const options = {
        timeout: TIMEOUTS.FIVE_SEC,
        interval: TIMEOUTS.HALF_SEC,
        errorMsg: `Expected "${message}" to be in the last message posted but not found.`,
    };
    return cy.waitUntil(checkFn, options);
}
Cypress.Commands.add('uiWaitUntilMessagePostedIncludes', uiWaitUntilMessagePostedIncludes);
function getNthPostId(index = 0): ChainableT<string> {
    waitUntilPermanentPost();
    return cy.findAllByTestId('postView').eq(index).should('have.attr', 'id').and('not.include', ':').
        invoke('replace', /^[^_]*_/, '');
}
Cypress.Commands.add('getNthPostId', getNthPostId);
function uiGetNthPost(index: number): ChainableT<JQuery> {
    waitUntilPermanentPost();
    return cy.findAllByTestId('postView').eq(index);
}
Cypress.Commands.add('uiGetNthPost', uiGetNthPost);
function postMessageFromFile(file: string, target = '#post_textbox'): ChainableT<any> {
    return cy.fixture(file, 'utf-8').then((text) => {
        return cy.get(target).clear().invoke('val', text).wait(TIMEOUTS.HALF_SEC).type(' {backspace}{enter}').should('have.text', '');
    });
}
Cypress.Commands.add('postMessageFromFile', postMessageFromFile);
function compareLastPostHTMLContentFromFile(file: string, timeout = TIMEOUTS.TEN_SEC): ChainableT<any> {
    return cy.getLastPostId().then((postId) => {
        const postMessageTextId = `#postMessageText_${postId}`;
        return cy.fixture(file, 'utf-8').then((expectedHtml) => {
            cy.get(postMessageTextId, {timeout}).should('have.html', expectedHtml.replace(/\n$/, ''));
        });
    });
}
Cypress.Commands.add('compareLastPostHTMLContentFromFile', compareLastPostHTMLContentFromFile);
export interface User {
    username: string;
}
function uiGotoDirectMessageWithUser(user: User) {
    cy.uiAddDirectMessage().click().wait(TIMEOUTS.ONE_SEC);
    cy.findByRole('dialog', {name: 'Direct Messages'}).should('be.visible').wait(TIMEOUTS.ONE_SEC);
    cy.findByRole('combobox', {name: 'Search for people'}).click({force: true}).
        type(user.username, {force: true}).wait(TIMEOUTS.ONE_SEC);
    cy.get('#multiSelectList').
        should('be.visible').
        children().
        should('have.length', 1);
    cy.get('body').
        type('{downArrow}').
        type('{enter}');
    cy.get('#saveItems').click();
    cy.get('#channelHeaderTitle').should('be.visible').and('contain.text', user.username);
}
Cypress.Commands.add('uiGotoDirectMessageWithUser', uiGotoDirectMessageWithUser);
function sendDirectMessageToUser(user: User, message: string) {
    cy.uiGotoDirectMessageWithUser(user);
    cy.postMessage(message);
}
Cypress.Commands.add('sendDirectMessageToUser', sendDirectMessageToUser);
function sendDirectMessageToUsers(users: User[], message: string) {
    cy.uiAddDirectMessage().click();
    users.forEach((user: User) => {
        cy.get('#selectItems input').should('be.enabled').type(`@${user.username}`, {force: true});
        cy.get('#multiSelectList').
            should('be.visible').
            children().
            should('have.length', 1);
        cy.get('body').
            type('{downArrow}').
            type('{enter}');
    });
    cy.get('#saveItems').click();
    users.forEach((user) => {
        cy.get('#channelHeaderTitle').should('be.visible').and('contain.text', user.username);
    });
    cy.postMessage(message);
}
Cypress.Commands.add('sendDirectMessageToUsers', sendDirectMessageToUsers);
function clickPostHeaderItem(postId: string, location: string, item: string) {
    let idPrefix: string;
    switch (location) {
    case 'CENTER':
        idPrefix = 'post';
        break;
    case 'RHS_ROOT':
    case 'RHS_COMMENT':
        idPrefix = 'rhsPost';
        break;
    case 'SEARCH':
        idPrefix = 'searchResult';
        break;
    default:
        idPrefix = 'post';
    }
    if (postId) {
        cy.get(`#${idPrefix}_${postId}`).trigger('mouseover', {force: true}).
            get(`#${location}_${item}_${postId}`).scrollIntoView().trigger('mouseover', {force: true}).click({force: true});
    } else {
        cy.getLastPostId().then((lastPostId) => {
            cy.get(`#${idPrefix}_${lastPostId}`).trigger('mouseover', {force: true}).
                get(`#${location}_${item}_${lastPostId}`).scrollIntoView().trigger('mouseover', {force: true}).click({force: true});
        });
    }
}
function clickPostTime(postId: string, location = 'CENTER') {
    clickPostHeaderItem(postId, location, 'time');
}
Cypress.Commands.add('clickPostTime', clickPostTime);
function clickPostSaveIcon(postId: string, location = 'CENTER') {
    clickPostHeaderItem(postId, location, 'flagIcon');
}
Cypress.Commands.add('clickPostSaveIcon', clickPostSaveIcon);
function clickPostDotMenu(postId: string, location = 'CENTER') {
    clickPostHeaderItem(postId, location, 'button');
}
Cypress.Commands.add('clickPostDotMenu', clickPostDotMenu);
function clickPostReactionIcon(postId: string, location = 'CENTER') {
    clickPostHeaderItem(postId, location, 'reaction');
}
Cypress.Commands.add('clickPostReactionIcon', clickPostReactionIcon);
function clickPostCommentIcon(postId: string, location = 'CENTER') {
    clickPostHeaderItem(postId, location, 'commentIcon');
}
Cypress.Commands.add('clickPostCommentIcon', clickPostCommentIcon);
function clickPostActionsMenu(postId: string, location = 'CENTER') {
    clickPostHeaderItem(postId, location, 'actions_button');
}
Cypress.Commands.add('clickPostActionsMenu', clickPostActionsMenu);
function createNewTeam(teamName: string, teamURL: string) {
    cy.visit('/create_team');
    cy.get('#teamNameInput').type(teamName).type('{enter}');
    cy.get('#teamURLInput').type(teamURL).type('{enter}');
    cy.visit(`/${teamURL}`);
}
Cypress.Commands.add('createNewTeam', createNewTeam);
function getCurrentTeamURL(siteURL: string): ChainableT<string> {
    let path: string;
    if (siteURL) {
        path = window.location.href.substring(siteURL.length);
    } else {
        path = window.location.pathname;
    }
    const result = path.split('/', 2);
    return cy.wrap(`/${(result[0] ? result[0] : result[1])}`);
}
Cypress.Commands.add('getCurrentTeamURL', getCurrentTeamURL);
function leaveTeam() {
    cy.uiOpenTeamMenu('Leave team');
    cy.get('#leaveTeamModal').should('be.visible');
    cy.get('#leaveTeamYes').click();
    cy.get('#leaveTeamModal').should('not.exist');
}
Cypress.Commands.add('leaveTeam', leaveTeam);
function clearPostTextbox(channelName = 'town-square') {
    cy.get(`#sidebarItem_${channelName}`).click({force: true});
    cy.uiGetPostTextBox().clear();
}
Cypress.Commands.add('clearPostTextbox', clearPostTextbox);
function minDisplaySettings() {
    cy.get('#themeTitle').should('be.visible', 'contain', 'Theme');
    cy.get('#themeEdit').should('be.visible', 'contain', 'Edit');
    cy.get('#clockTitle').should('be.visible', 'contain', 'Clock Display');
    cy.get('#clockEdit').should('be.visible', 'contain', 'Edit');
    cy.get('#name_formatTitle').should('be.visible', 'contain', 'Teammate Name Display');
    cy.get('#name_formatEdit').should('be.visible', 'contain', 'Edit');
    cy.get('#collapseTitle').should('be.visible', 'contain', 'Default appearance of image previews');
    cy.get('#collapseEdit').should('be.visible', 'contain', 'Edit');
    cy.get('#message_displayTitle').scrollIntoView().should('be.visible', 'contain', 'Message Display');
    cy.get('#message_displayEdit').should('be.visible', 'contain', 'Edit');
    cy.get('#languagesTitle').scrollIntoView().should('be.visible', 'contain', 'Language');
    cy.get('#languagesEdit').should('be.visible', 'contain', 'Edit');
}
Cypress.Commands.add('minDisplaySettings', minDisplaySettings);
function userStatus(statusInt: number) {
    cy.get('.status-wrapper.status-selector').click();
    cy.get('.MenuItem').eq(statusInt).click();
}
Cypress.Commands.add('userStatus', userStatus);
function getCurrentChannelId(): ChainableT<string> {
    return cy.get('#channel-header', {timeout: TIMEOUTS.HALF_MIN}).invoke('attr', 'data-channelid');
}
Cypress.Commands.add('getCurrentChannelId', getCurrentChannelId);
function updateChannelHeader(text: string) {
    cy.get('#channelHeaderDropdownButton').click();
    cy.findByText('Channel Settings').should('be.visible').click();
    cy.get('.ChannelSettingsModal').should('be.visible');
    cy.get('#channel_settings_header_textbox').
        should('be.visible').
        clear().
        type(text);
    cy.get('[data-testid="SaveChangesPanel__save-btn"]').click();
    cy.get('.SaveChangesPanel').should('contain', 'Settings saved');
    cy.get('.GenericModal .modal-header button[aria-label="Close"]').click();
    cy.get('.ChannelSettingsModal').should('not.exist');
    cy.wait(TIMEOUTS.HALF_SEC);
}
Cypress.Commands.add('updateChannelHeader', updateChannelHeader);
function updateDMGMChannelHeader(text: string) {
    cy.get('#channelHeaderTitle').
        should('be.visible').
        click();
    cy.get('#channelHeaderDropdownMenu').
        should('be.visible');
    cy.findByText('Edit Header').click();
    cy.get('#edit_textbox').
        clear().
        type(text).
        type('{enter}').
        wait(TIMEOUTS.HALF_SEC);
}
Cypress.Commands.add('updateDMGMChannelHeader', updateDMGMChannelHeader);
function checkRunLDAPSync(): ChainableT<any> {
    return cy.apiGetLDAPSync().then((response) => {
        const jobs = response.body;
        const currentTime = new Date();
        if (jobs.length === 0 || jobs[0].status === 'error' || ((currentTime.getTime() - (new Date(jobs[0].last_activity_at)).getTime()) > 8640000)) {
            cy.visit('/admin_console/authentication/ldap');
            cy.findByText('AD/LDAP Test').click();
            cy.findByText('AD/LDAP Test Successful').should('be.visible');
            cy.findByText('AD/LDAP Synchronize Now').click().wait(TIMEOUTS.ONE_SEC);
            cy.findByTestId('jobTable').
                find('tbody > tr').
                eq(0).
                as('firstRow');
            cy.waitUntil(() => {
                return cy.get('@firstRow').then((el) => {
                    return el.find('.status-icon-success').length > 0;
                });
            }
            , {
                timeout: TIMEOUTS.FIVE_MIN,
                interval: TIMEOUTS.TWO_SEC,
                errorMsg: 'AD/LDAP Sync Job did not finish',
            });
        }
    });
}
Cypress.Commands.add('checkRunLDAPSync', checkRunLDAPSync);
function clickEmojiInEmojiPicker(emojiName: string) {
    cy.get('#emojiPicker').should('exist').and('be.visible').within(() => {
        cy.findAllByTestId(emojiName).eq(0).trigger('mouseover', {force: true});
        cy.findAllByTestId('emoji_picker_preview').eq(0).should('exist').and('be.visible').contains(emojiName, {matchCase: false});
        cy.findAllByTestId(emojiName).eq(0).click({force: true});
    });
}
Cypress.Commands.add('clickEmojiInEmojiPicker', clickEmojiInEmojiPicker);
function verifyPostedMessage(message) {
    cy.wait(TIMEOUTS.HALF_SEC).getLastPostId().then((postId) => {
        cy.get(`#post_${postId}`).within(() => {
            cy.get(`#postMessageText_${postId}`).contains(message);
        });
    });
}
Cypress.Commands.add('verifyPostedMessage', verifyPostedMessage);
function verifyEphemeralMessage(message, isCompactMode, needsToScroll) {
    if (needsToScroll) {
        cy.get('#postListContent').within(() => {
            cy.get('.post-list__dynamic').scrollTo('bottom', {ensureScrollable: false});
        });
    }
    cy.wait(TIMEOUTS.HALF_SEC).getLastPostId().then((postId) => {
        cy.get(`#post_${postId}`).within(() => {
            if (isCompactMode) {
                cy.get(`#postMessageText_${postId}`).contains(message);
                cy.get(`#postMessageText_${postId}`).contains('(Only visible to you)');
            } else {
                cy.get('.post__visibility').last().should('exist').and('have.text', '(Only visible to you)');
                cy.get(`#postMessageText_${postId}`).contains(message);
            }
        });
    });
}
Cypress.Commands.add('verifyEphemeralMessage', verifyEphemeralMessage);
declare global {
    namespace Cypress {
        interface Chainable {
            logout: typeof logout;
            getCurrentUserId: typeof getCurrentUserId;
            typeCmdOrCtrl: typeof typeCmdOrCtrl;
            typeCmdOrCtrlForEdit: typeof typeCmdOrCtrlForEdit;
            cmdOrCtrlShortcut: typeof cmdOrCtrlShortcut;
            postMessage: typeof postMessage;
            postMessageReplyInRHS: typeof postMessageReplyInRHS;
            uiWaitUntilMessagePostedIncludes: typeof uiWaitUntilMessagePostedIncludes;
            uiGetNthPost: typeof uiGetNthPost;
            uiPostMessageQuickly(message: string): ChainableT<void>;
            clickEmojiInEmojiPicker(emojiName: string): ChainableT<void>;
            getLastPost: typeof getLastPost;
            getLastPostId: typeof getLastPostId;
            getNthPostId: typeof getNthPostId;
            postMessageFromFile: typeof postMessageFromFile;
            compareLastPostHTMLContentFromFile: typeof compareLastPostHTMLContentFromFile;
            uiGotoDirectMessageWithUser(user: User): ChainableT<void>;
            sendDirectMessageToUser: typeof sendDirectMessageToUser;
            sendDirectMessageToUsers(users: User[], message: string): ChainableT<any>;
            clickPostTime(postId: string, location: string): ChainableT<void>;
            clickPostSaveIcon(postId: string, location?: string): ChainableT<void>;
            clickPostDotMenu(postId?: string, location?: string): ChainableT<void>;
            clickPostReactionIcon(postId?: string, location?: string): ChainableT<void>;
            clickPostCommentIcon(postId: string, location?: string): ChainableT<void>;
            clickPostActionsMenu(postId: string, location?: string): ChainableT<void>;
            createNewTeam(teamName: string, teamURL: string): ChainableT<void>;
            getCurrentTeamURL: typeof getCurrentTeamURL;
            leaveTeam(): ChainableT<void>;
            clearPostTextbox(channelName: string): ChainableT<void>;
            minDisplaySettings(): ChainableT<void>;
            userStatus(statusInt: number): ChainableT<void>;
            getCurrentChannelId: typeof getCurrentChannelId;
            updateChannelHeader(text: string): ChainableT<void>;
            updateDMGMChannelHeader(text: string): ChainableT<void>;
            checkRunLDAPSync: typeof checkRunLDAPSync;
            verifyPostedMessage: typeof verifyPostedMessage;
            verifyEphemeralMessage: typeof verifyEphemeralMessage;
        }
    }
}