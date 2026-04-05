import * as MESSAGES from '../../../../fixtures/messages';
import {
    doReactToLastMessageShortcut,
    pressEscapeKey,
} from './helpers';
describe('Keyboard shortcut CTRL/CMD+Shift+\\ for adding reaction to last message', () => {
    let testUser;
    let testTeam;
    let emptyChannel;
    before(() => {
        cy.apiInitSetup().then(({team, channel, user}) => {
            testUser = user;
            testTeam = team;
            emptyChannel = channel;
        });
    });
    beforeEach(() => {
        cy.apiLogin(testUser);
        cy.visit(`/${testTeam.name}/channels/off-topic`);
        cy.postMessage('hello');
    });
    it('MM-T4059_1 Do not open if emoji picker is already opened for other message', () => {
        cy.getLastPostId().then((firstPostId) => {
            cy.postMessage(MESSAGES.MEDIUM);
            cy.clickPostReactionIcon(firstPostId);
            doReactToLastMessageShortcut();
            cy.clickEmojiInEmojiPicker('smile');
            cy.getLastPostId().then((lastPostId) => {
                cy.get(`#${lastPostId}_message`).within(() => {
                    cy.findByLabelText('reactions').should('not.exist');
                    cy.findByLabelText('remove reaction smile').should('not.exist');
                });
            });
        });
    });
    it('MM-T4059_2 Do not open emoji picker if last message is not visible in view', () => {
        cy.getLastPostId().then((lastPostId) => {
            cy.get(`#${lastPostId}_message`).as('firstPost');
        });
        Cypress._.times(5, () => {
            cy.uiPostMessageQuickly(MESSAGES.HUGE);
        });
        cy.postMessage(MESSAGES.SMALL);
        cy.getLastPostId().then((lastPostId) => {
            cy.get(`#${lastPostId}_message`).as('lastPost');
        });
        cy.get('@firstPost').scrollIntoView();
        doReactToLastMessageShortcut();
        cy.get('#emojiPicker').should('not.exist');
        cy.get('@lastPost').within(() => {
            cy.findByLabelText('reactions').should('not.exist');
        });
    });
    it('MM-T4059_3 Do not open emoji picker if any modal is open', () => {
        cy.uiOpenProductMenu('About Mattermost');
        verifyEmojiPickerNotOpen();
        cy.uiOpenTeamMenu('View members');
        verifyEmojiPickerNotOpen();
        cy.uiOpenProfileModal('Profile Settings');
        verifyEmojiPickerNotOpen();
        cy.uiOpenChannelMenu('Channel Settings');
        verifyEmojiPickerNotOpen();
        ['Channel Purpose', 'Channel Header'].forEach((modal) => {
            cy.uiOpenChannelMenu('View Info');
            cy.findByText(modal).parent().findAllByRole('button', {name: 'Edit'}).click();
            doReactToLastMessageShortcut();
            cy.get('#emojiPicker').should('not.exist');
            pressEscapeKey();
            cy.uiOpenChannelMenu('Close Info');
        });
    });
    it('MM-T4059_4 Do not open emoji picker if any dropdown is open', () => {
        cy.uiOpenChannelMenu();
        doReactToLastMessageShortcut();
        cy.get('#emojiPicker').should('not.exist');
        pressEscapeKey();
        cy.uiOpenTeamMenu();
        doReactToLastMessageShortcut();
        cy.get('#emojiPicker').should('not.exist');
    });
    it('MM-T4059_5 Do not open emoji picker if RHS is fully expanded for search results, recent mentions and saved posts', () => {
        cy.uiGetSavedPostButton().click();
        cy.findByLabelText('Expand Sidebar Icon').click();
        doReactToLastMessageShortcut();
        cy.get('#emojiPicker').should('not.exist');
        cy.findByLabelText('Collapse Sidebar Icon').click();
        cy.findByLabelText('Expand Sidebar Icon').click();
        doReactToLastMessageShortcut();
        cy.get('#emojiPicker').should('not.exist');
        cy.findByLabelText('Collapse Sidebar Icon').click();
    });
    it('MM-T4059_6 Do not open emoji picker if last post is a system message', () => {
        cy.apiAdminLogin();
        cy.visit(`/${testTeam.name}/channels/${emptyChannel.name}`);
        cy.findAllByTestId('postView').should('have.length', 1);
        doReactToLastMessageShortcut();
        cy.get('#emojiPicker').should('not.exist');
        cy.getLastPostId().then((lastPostId) => {
            cy.clickPostDotMenu(lastPostId);
            cy.get(`#delete_post_${lastPostId}`).click();
            cy.get('#deletePostModal').should('be.visible');
            cy.get('#deletePostModalButton').click();
            doReactToLastMessageShortcut('CENTER');
            cy.get('#emojiPicker').should('not.exist');
        });
        cy.postMessage(MESSAGES.TINY);
        cy.apiDeleteChannel(emptyChannel.id);
        doReactToLastMessageShortcut();
        cy.get('#emojiPicker').should('not.exist');
    });
});
function verifyEmojiPickerNotOpen() {
    doReactToLastMessageShortcut();
    cy.get('#emojiPicker').should('not.exist');
    pressEscapeKey();
}