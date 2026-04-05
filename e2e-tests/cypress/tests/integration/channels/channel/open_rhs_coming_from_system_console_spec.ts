import * as TIMEOUTS from '../../../fixtures/timeouts';
import * as MESSAGES from '../../../fixtures/messages';
describe('Channel RHS', () => {
    let testAdmin: Cypress.UserProfile;
    let testTeam: Cypress.Team;
    let testChannel: Cypress.Channel;
    before(() => {
        cy.apiCreateCustomAdmin({loginAfter: true}).then(({sysadmin}) => {
            testAdmin = sysadmin;
            cy.apiCreateTeam('team1', 'team1').then(({team}) => {
                testTeam = team;
                cy.apiAddUserToTeam(testTeam.id, testAdmin.id);
                cy.apiCreateChannel(testTeam.id, 'channel', 'channel', 'O').then(({channel}) => {
                    testChannel = channel;
                    cy.apiAddUserToChannel(channel.id, testAdmin.id);
                    cy.apiSaveCRTPreference(testAdmin.id, 'off');
                    cy.apiLogin(testAdmin);
                });
            });
        });
    });
    beforeEach(() => {
        cy.visit(`/${testTeam.name}/channels/${testChannel.name}`);
    });
    it('MM-44435 - should be able to open channel info, visit the system console and come back without issues -- KNOWN ISSUE: MM-47226', () => {
        cy.uiGetChannelInfoButton().click();
        verifyRHSisOpenAndHasTitle('Info');
        openSystemConsoleAndLeave();
        verifyRHSisOpenAndHasTitle('Info');
    });
    it('MM-T5311 - should be able to open recent mentions, visit the system console and come back without issues', () => {
        cy.uiGetRecentMentionButton().click();
        verifyRHSisOpenAndHasTitle('Recent Mentions');
        openSystemConsoleAndLeave();
        verifyRHSisOpenAndHasTitle('Recent Mentions');
    });
    it('MM-T5312 - should be able to open saved messages, visit the system console and come back without issues', () => {
        cy.uiGetSavedPostButton().click();
        verifyRHSisOpenAndHasTitle('Saved messages');
        openSystemConsoleAndLeave();
        verifyRHSisOpenAndHasTitle('Saved messages');
    });
    it('MM-T5313 - should be able to open Pinned messages, visit the system console and come back without issues', () => {
        cy.uiGetChannelPinButton().click();
        verifyRHSisOpenAndHasTitle('Pinned messages');
        openSystemConsoleAndLeave();
        verifyRHSisOpenAndHasTitle('Pinned messages');
    });
    it('MM-T5314 - should be able to open channel members, visit the system console and come back without issues', () => {
        cy.uiGetChannelMemberButton().click();
        verifyRHSisOpenAndHasTitle('Members');
        openSystemConsoleAndLeave();
        verifyRHSisOpenAndHasTitle('Members');
    });
    it('MM-T5315 - should be able to open channel files, visit the system console and come back without issues', () => {
        cy.uiGetChannelFileButton().click();
        verifyRHSisOpenAndHasTitle('Recent files');
        openSystemConsoleAndLeave();
        verifyRHSisOpenAndHasTitle('Recent files');
    });
    it('MM-T5316 - should be able to open search results, visit the system console and come back without issues', () => {
        cy.postMessage(MESSAGES.SMALL);
        cy.uiGetSearchContainer().click();
        cy.uiGetSearchBox().clear().type(MESSAGES.TINY).type('{enter}');
        verifyRHSisOpenAndHasTitle('Search Results');
        openSystemConsoleAndLeave();
        verifyRHSisOpenAndHasTitle('Search Results');
    });
    it('MM-T5317 - should be able to open thread reply, visit the system console and come back without issues', () => {
        cy.postMessage(MESSAGES.SMALL);
        cy.getLastPostId().then((postId) => {
            cy.clickPostCommentIcon(postId);
        });
        verifyRHSisOpenAndHasTitle('Thread');
        openSystemConsoleAndLeave();
        verifyRHSisOpenAndHasTitle('Thread');
    });
    it('MM-T5318 - should be able to open thread reply with CRT, visit the system console and come back without issues', () => {
        cy.apiSaveCRTPreference(testAdmin.id, 'on');
        cy.reload();
        cy.postMessage(MESSAGES.SMALL);
        cy.getLastPostId().then((postId) => {
            cy.clickPostCommentIcon(postId);
        });
        verifyRHSisOpenAndHasTitle('Thread');
        openSystemConsoleAndLeave();
        verifyRHSisOpenAndHasTitle('Thread');
    });
});
function openSystemConsoleAndLeave() {
    cy.uiOpenProductMenu('System Console');
    cy.wait(TIMEOUTS.THREE_SEC);
    cy.get('.backstage-navbar__back').click();
}
function verifyRHSisOpenAndHasTitle(title: string) {
    cy.get('#sidebar-right').should('exist').within(() => {
        cy.findByText(title).should('exist').and('be.visible');
    });
}