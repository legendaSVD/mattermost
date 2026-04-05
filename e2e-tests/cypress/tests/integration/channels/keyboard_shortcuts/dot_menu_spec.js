import {beUnread} from '../../../support/assertions';
import {stubClipboard} from '../../../utils';
describe('Keyboard Shortcuts', () => {
    let testTeam;
    let testChannel;
    const postMessage = 'test for saved post';
    const postEditMessage = ' POST EDITED';
    before(() => {
        cy.apiInitSetup({loginAfter: true}).then(({team, channel}) => {
            testTeam = team;
            testChannel = channel;
            cy.visit(`/${team.name}/channels/off-topic`);
        });
        cy.postMessage(postMessage);
    });
    it('MM-T4801 Dot menu keyboard shortcuts', () => {
        cy.getLastPostId().then((postId) => {
            stubClipboard().as('clipboard');
            const permalink = `${Cypress.config('baseUrl')}/${testTeam.name}/pl/${postId}`;
            cy.uiPostDropdownMenuShortcut(postId, 'Reply', 'R');
            cy.uiGetReplyTextBox().should('be.focused');
            cy.uiPostDropdownMenuShortcut(postId, 'Mark as Unread', 'U');
            cy.get(`#sidebarItem_${testChannel.name}`).should(beUnread);
            cy.uiPostDropdownMenuShortcut(postId, 'Pin to Channel', 'P');
            cy.get(`#post_${postId}`).find('.post-pre-header').should('be.visible').and('have.text', 'Pinned');
            cy.uiPostDropdownMenuShortcut(postId, 'Unpin from Channel', 'P');
            cy.get(`#post_${postId}`).and('not.have.text', 'Pinned');
            cy.uiPostDropdownMenuShortcut(postId, 'Copy Link', 'K');
            cy.get('@clipboard').its('contents').should('eq', permalink);
            cy.uiPostDropdownMenuShortcut(postId, 'Edit', 'E');
            cy.get('#edit_textbox').type(postEditMessage);
            cy.get('#create_post').findByText('Save').should('be.visible').click();
            cy.uiWaitUntilMessagePostedIncludes(postMessage + postEditMessage);
            cy.get(`#postMessageText_${postId}`).
                and('have.text', postMessage + postEditMessage + ' Edited');
            cy.uiPostDropdownMenuShortcut(postId, 'Copy Text', 'C');
            cy.get('@clipboard').its('contents').should('eq', postMessage + postEditMessage);
        });
        cy.postMessage('message to delete');
        cy.getLastPostId().then((postId) => {
            cy.uiPostDropdownMenuShortcut(postId, 'Delete', '{del}');
            cy.findByText('Delete').click();
            cy.findByText('message to delete').should('not.exist');
        });
        cy.getLastPostId().then((postId) => {
            cy.findByText('Saved').should('not.exist');
            cy.uiPostDropdownMenuShortcut(postId, 'Save Message', 'S', 'RHS_ROOT');
            cy.get(`#post_${postId}`).find('.post-pre-header').should('be.visible').and('have.text', 'Saved');
            cy.uiPostDropdownMenuShortcut(postId, 'Remove from Saved', 'S', 'RHS_ROOT');
            cy.get(`#post_${postId}`).and('not.have.text', 'Saved');
        });
    });
});