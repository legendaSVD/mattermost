import * as TIMEOUTS from '../../../../fixtures/timeouts';
import * as MESSAGES from '../../../../fixtures/messages';
import {
    checkReactionFromPost,
    doReactToLastMessageShortcut,
} from './helpers';
describe('Keyboard shortcut CTRL/CMD+Shift+\\ for adding reaction to last message', () => {
    let testUser;
    let testTeam;
    before(() => {
        cy.apiInitSetup().then(({team, user}) => {
            testUser = user;
            testTeam = team;
        });
    });
    beforeEach(() => {
        cy.apiLogin(testUser);
        cy.visit(`/${testTeam.name}/channels/off-topic`);
        cy.get('#channelHeaderTitle', {timeout: TIMEOUTS.ONE_MIN}).should('be.visible').and('contain', 'Off-Topic');
        cy.postMessage(MESSAGES.TINY);
    });
    it('MM-T4058_1 Open emoji picker for root post in RHS when focus is on comment textbox', () => {
        cy.clickPostCommentIcon();
        cy.get('#rhsContainer').should('be.visible');
        doReactToLastMessageShortcut('RHS');
        cy.clickEmojiInEmojiPicker('smile');
        cy.getLastPostId().then((lastPostId) => {
            checkReactionFromPost(lastPostId);
        });
        cy.uiCloseRHS();
    });
    it('MM-T4058_2 Open emoji picker for last comment in RHS when focus is on comment textbox', () => {
        cy.clickPostCommentIcon();
        cy.get('#rhsContainer').should('be.visible');
        cy.postMessageReplyInRHS(MESSAGES.SMALL);
        cy.postMessageReplyInRHS(MESSAGES.TINY);
        doReactToLastMessageShortcut('RHS');
        cy.clickEmojiInEmojiPicker('smile');
        cy.getLastPostId().then((lastPostId) => {
            checkReactionFromPost(lastPostId);
        });
        cy.uiCloseRHS();
    });
    it('MM-T4058_3 Open emoji picker for last comment in fully expanded RHS when focus is on comment textbox', () => {
        cy.clickPostCommentIcon();
        cy.get('#rhsContainer').should('be.visible');
        cy.uiExpandRHS();
        doReactToLastMessageShortcut('RHS');
        cy.clickEmojiInEmojiPicker('smile');
        cy.getLastPostId().then((lastPostId) => {
            checkReactionFromPost(lastPostId);
        });
    });
});