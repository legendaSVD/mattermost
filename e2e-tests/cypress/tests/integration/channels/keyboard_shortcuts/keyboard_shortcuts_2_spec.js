import * as TIMEOUTS from '../../../fixtures/timeouts';
import {isMac} from '../../../utils';
describe('Keyboard Shortcuts', () => {
    let testTeam;
    let testUser;
    let otherUser;
    before(() => {
        cy.apiInitSetup().then(({team, channel, user}) => {
            testTeam = team;
            testUser = user;
            cy.apiCreateUser({prefix: 'other'}).then(({user: user1}) => {
                otherUser = user1;
                cy.apiAddUserToTeam(testTeam.id, otherUser.id).then(() => {
                    cy.apiAddUserToChannel(channel.id, otherUser.id);
                });
            });
        });
    });
    beforeEach(() => {
        cy.apiAdminLogin();
        cy.visit(`/${testTeam.name}/channels/town-square`);
    });
    it('MM-T1239 - CTRL+/ and CMD+/ and /shortcuts', () => {
        cy.uiGetPostTextBox().cmdOrCtrlShortcut('/');
        modalShouldOpen();
        cy.get('.section').eq(2).within(() => {
            cy.findByText('Files').should('be.visible');
            cy.get('.shortcut-line').should('be.visible').as('shortcutLine');
            if (isMac()) {
                cy.get('@shortcutLine').findByText('⌘').should('be.visible');
            } else {
                cy.get('@shortcutLine').findByText('Ctrl').should('be.visible');
            }
            cy.get('@shortcutLine').findByText('U').should('be.visible');
        });
        cy.get('body').cmdOrCtrlShortcut('/');
        cy.get('#shortcutsModalLabel').should('not.exist');
        cy.uiGetPostTextBox().clear().type('/shortcuts{enter}');
        modalShouldOpen();
        cy.get('.modal-header button.close').should('have.attr', 'aria-label', 'Close').click();
        cy.get('#shortcutsModalLabel').should('not.exist');
        cy.uiGetPostTextBox().clear().type('/shortcuts{enter}');
        cy.get('body').type('{esc}');
        cy.get('#shortcutsModalLabel').should('not.exist');
    });
    it('MM-T1254 - CTRL/CMD+UP; CTRL/CMD+DOWN', () => {
        const messagePrefix = 'hello from current user: ';
        let message;
        const count = 5;
        for (let index = 0; index < count; index++) {
            message = messagePrefix + index;
            cy.postMessage(message);
        }
        for (let index = 0; index < count; index++) {
            cy.uiGetPostTextBox().cmdOrCtrlShortcut('{uparrow}');
            message = messagePrefix + (4 - index);
            cy.uiGetPostTextBox().contains(message);
        }
        cy.uiGetPostTextBox().cmdOrCtrlShortcut('{uparrow}');
        message = messagePrefix + '0';
        cy.uiGetPostTextBox().contains(message);
        for (let index = 1; index < count; index++) {
            cy.uiGetPostTextBox().cmdOrCtrlShortcut('{downarrow}');
            message = messagePrefix + index;
            cy.uiGetPostTextBox().contains(message);
        }
    });
    it('MM-T1260 - UP arrow', () => {
        const message = 'Test';
        const editMessage = 'Edit Test';
        cy.uiGetPostTextBox().clear().type(message).type('{enter}').wait(TIMEOUTS.HALF_SEC);
        cy.getLastPostId().then(() => {
            cy.uiGetPostTextBox().type('{uparrow}');
            cy.get('#edit_textbox').should('be.visible');
            cy.get('#edit_textbox').invoke('val', '').clear().type(editMessage).type('{enter}').wait(TIMEOUTS.HALF_SEC);
        });
        cy.getLastPostId().then((postId) => {
            cy.get(`#postEdited_${postId}`).
                should('be.visible').
                should('contain', 'Edited');
        });
    });
    it('MM-T1273 - @[character]+TAB', () => {
        const userName = `${testUser.username}`;
        cy.uiGetPostTextBox().clear().type('@' + userName.substring(0, 5)).wait(TIMEOUTS.HALF_SEC);
        cy.get('#suggestionList').should('be.visible').focused().tab();
        cy.uiGetPostTextBox().should('contain', userName);
        cy.uiGetPostTextBox().clear();
    });
    it('MM-T1274 - :[character]+TAB', () => {
        const emojiName = ':tomato';
        cy.uiGetPostTextBox().clear().type(emojiName.substring(0, 3)).wait(TIMEOUTS.HALF_SEC);
        cy.get('body').type('{downarrow}').wait(TIMEOUTS.HALF_SEC);
        cy.get('body').type('{downarrow}').wait(TIMEOUTS.HALF_SEC);
        cy.get('body').type('{downarrow}').wait(TIMEOUTS.HALF_SEC);
        cy.get('body').type('{downarrow}').wait(TIMEOUTS.HALF_SEC);
        cy.get('#suggestionList').should('be.visible').focused().tab();
        cy.uiGetPostTextBox().should('contain', emojiName);
    });
    it('MM-T1275 - SHIFT+UP', () => {
        const message = `hello${Date.now()}`;
        cy.postMessage(message);
        cy.uiGetPostTextBox().type('{shift}{uparrow}');
        cy.uiGetReplyTextBox().should('be.focused');
        cy.getLastPostId().then((postId) => {
            cy.get(`#rhsPostMessageText_${postId}`).should('exist');
        });
    });
    it('MM-T1279 - Keyboard shortcuts menu item', () => {
        cy.uiOpenHelpMenu('Keyboard shortcuts');
        modalShouldOpen();
    });
});
function modalShouldOpen() {
    const name = isMac() ? /Keyboard shortcuts ⌘ \
    cy.findByRole('dialog', {name}).should('be.visible');
}