import {Channel} from '@mattermost/types/channels';
import {Team} from '@mattermost/types/teams';
import * as TIMEOUTS from '../../../../fixtures/timeouts';
describe('Verify Accessibility Support in different input fields', () => {
    let testTeam: Team;
    let testChannel: Channel;
    before(() => {
        cy.apiRequireLicenseForFeature('GuestAccounts');
        cy.apiInitSetup().then(({team}) => {
            testTeam = team;
        });
    });
    beforeEach(() => {
        cy.apiCreateChannel(testTeam.id, 'accessibility', 'accessibility').then(({channel}) => {
            testChannel = channel;
            cy.visit(`/${testTeam.name}/channels/${testChannel.name}`);
        });
    });
    it('MM-T1456 Verify Accessibility Support in Input fields in Invite People Flow', () => {
        cy.uiOpenTeamMenu('Invite people');
        cy.get('.InviteAs').findByTestId('inviteMembersLink').click();
        cy.findByTestId('InviteView__copyInviteLink').then((el) => {
            const copyInviteLinkAriaLabel = el.attr('aria-label');
            expect(copyInviteLinkAriaLabel).to.match(/^team invite link/i);
        });
        cy.get('.users-emails-input__control').should('be.visible').within(() => {
            cy.get('input').should('have.attr', 'aria-label', 'Invite People').and('have.attr', 'aria-autocomplete', 'list');
            cy.get('.users-emails-input__placeholder').should('have.text', 'Enter a name or email address');
        });
        cy.findByTestId('inviteGuestLink').should('be.visible').click();
        cy.get('.users-emails-input__control').should('be.visible').within(() => {
            cy.get('input').should('have.attr', 'aria-label', 'Invite People').and('have.attr', 'aria-autocomplete', 'list');
            cy.get('.users-emails-input__placeholder').should('have.text', 'Enter a name or email address');
        });
        cy.get('.channels-input__control').should('be.visible').within(() => {
            cy.get('input').should('have.attr', 'aria-label', 'Search and Add Channels').and('have.attr', 'aria-autocomplete', 'list');
            cy.get('.channels-input__placeholder').should('have.text', `e.g. ${testChannel.display_name}`);
        });
    });
    it('MM-T1457 Verify Accessibility Support in Search Autocomplete', () => {
        for (let i = 0; i < 5; i++) {
            cy.apiCreateUser().then(({user}) => {
                cy.apiAddUserToTeam(testTeam.id, user.id).then(() => {
                    cy.apiAddUserToChannel(testChannel.id, user.id);
                });
            });
        }
        cy.uiGetSearchContainer().click();
        cy.uiGetSearchBox().should('have.attr', 'aria-describedby', 'searchbar-help-popup').and('have.attr', 'aria-label', 'Search messages');
        cy.uiGetSearchBox().focus();
        cy.get('#searchHints').should('be.visible');
        cy.uiGetSearchBox().type('from:').wait(TIMEOUTS.ONE_SEC);
        cy.uiGetSearchBox().clear().type('from:').wait(TIMEOUTS.ONE_SEC).type('{downarrow}{downarrow}');
        verifySearchAutocomplete(2);
        cy.focused().type('{downarrow}{downarrow}');
        verifySearchAutocomplete(4);
        cy.focused().type('{uparrow}');
        verifySearchAutocomplete(3);
        cy.uiGetSearchBox().clear().type('in:').wait(TIMEOUTS.ONE_SEC);
        cy.uiGetSearchBox().clear().type('in:').wait(TIMEOUTS.ONE_SEC).type('{downarrow}{downarrow}');
        verifySearchAutocomplete(2);
        cy.focused().type('{uparrow}{uparrow}');
        verifySearchAutocomplete(0);
    });
    it('MM-T1455 Verify Accessibility Support in Message Autocomplete', () => {
        cy.apiCreateUser().then(({user}) => {
            cy.apiAddUserToTeam(testTeam.id, user.id).then(() => {
                cy.apiAddUserToChannel(testChannel.id, user.id).then(() => {
                    cy.uiGetPostTextBox().should('have.attr', 'placeholder', `Write to ${testChannel.display_name}`).clear().focus();
                    cy.uiGetPostTextBox().type('@').wait(TIMEOUTS.ONE_SEC);
                    cy.get('#suggestionList').find('.suggestion-list__item').eq(0).within((el) => {
                        cy.get('.suggestion-list__main').invoke('text').then((text) => {
                            cy.wrap(el).parents('body').find('#post_textbox').clear().type(text);
                        });
                    });
                    cy.uiGetPostTextBox().clear().type('@').wait(TIMEOUTS.ONE_SEC).type('{uparrow}{uparrow}{downarrow}');
                    verifyMessageAutocomplete(1);
                    cy.focused().type('{downarrow}{uparrow}{uparrow}');
                    verifyMessageAutocomplete(0);
                    cy.uiGetPostTextBox().clear().type('~').wait(TIMEOUTS.ONE_SEC);
                    cy.uiGetPostTextBox().clear().type('~').wait(TIMEOUTS.FIVE_SEC).type('{downarrow}{downarrow}');
                    verifyMessageAutocomplete(2);
                    cy.focused().type('{downarrow}{uparrow}{uparrow}');
                    verifyMessageAutocomplete(1);
                });
            });
        });
    });
    it('MM-T1458 Verify Accessibility Support in Main Post Input', () => {
        cy.get('#advancedTextEditorCell').within(() => {
            cy.uiGetPostTextBox().should('have.attr', 'placeholder', `Write to ${testChannel.display_name}`).and('have.attr', 'role', 'textbox').clear().focus().type('test');
            cy.get('#FormattingControl_bold').focus().tab({shift: true});
            cy.get('#PreviewInputTextButton').should('be.focused').and('have.attr', 'aria-label', 'preview').tab();
            cy.get('#FormattingControl_bold').should('be.focused').and('have.attr', 'aria-label', 'bold').tab();
            cy.get('#FormattingControl_italic').should('be.focused').and('have.attr', 'aria-label', 'italic').tab();
            cy.get('#FormattingControl_strike').should('be.focused').and('have.attr', 'aria-label', 'strike through').tab();
            cy.get('#FormattingControl_heading').should('be.focused').and('have.attr', 'aria-label', 'heading').tab();
            cy.get('#FormattingControl_link').should('be.focused').and('have.attr', 'aria-label', 'link').tab();
            cy.get('#FormattingControl_code').should('be.focused').and('have.attr', 'aria-label', 'code').tab();
            cy.get('#FormattingControl_quote').should('be.focused').and('have.attr', 'aria-label', 'quote').tab();
            cy.get('#FormattingControl_ul').should('be.focused').and('have.attr', 'aria-label', 'bulleted list').tab();
            cy.get('#FormattingControl_ol').should('be.focused').and('have.attr', 'aria-label', 'numbered list');
            cy.get('#toggleFormattingBarButton').focus();
            cy.get('#toggleFormattingBarButton').should('be.focused').and('have.attr', 'aria-label', 'formatting').tab();
            cy.get('#fileUploadButton').should('be.focused').and('have.attr', 'aria-label', 'attachment').tab();
            cy.get('#emojiPickerButton').should('be.focused').and('have.attr', 'aria-label', 'select an emoji').tab();
        });
        cy.findByTestId('SendMessageButton').should('be.focused');
    });
    it('MM-T1490 Verify Accessibility Support in RHS Input', () => {
        cy.uiGetPostTextBox().clear();
        const message = `hello${Date.now()}`;
        cy.postMessage(message);
        cy.getLastPostId().then((postId) => {
            cy.clickPostCommentIcon(postId);
        });
        cy.get('#rhsContainer').within(() => {
            cy.uiGetReplyTextBox().should('have.attr', 'placeholder', 'Reply to this thread...').and('have.attr', 'role', 'textbox').focus().type('test').tab();
            cy.get('#PreviewInputTextButton').should('be.focused').and('have.attr', 'aria-label', 'preview').tab();
            cy.get('#FormattingControl_bold').should('be.focused').and('have.attr', 'aria-label', 'bold').tab();
            cy.get('#HiddenControlsButtonRHS_COMMENT').focus().click().tab();
            cy.get('#FormattingControl_italic').should('exist').and('have.attr', 'aria-label', 'italic');
            cy.get('#FormattingControl_strike').should('exist').and('have.attr', 'aria-label', 'strike through');
            cy.get('#FormattingControl_heading').should('exist').and('have.attr', 'aria-label', 'heading');
            cy.get('#FormattingControl_link').should('exist').and('have.attr', 'aria-label', 'link');
            cy.get('#FormattingControl_code').should('exist').and('have.attr', 'aria-label', 'code');
            cy.get('#FormattingControl_quote').should('exist').and('have.attr', 'aria-label', 'quote');
            cy.get('#FormattingControl_ul').should('exist').and('have.attr', 'aria-label', 'bulleted list');
            cy.get('#FormattingControl_ol').should('exist').and('have.attr', 'aria-label', 'numbered list');
            cy.get('#HiddenControlsButtonRHS_COMMENT').focus().type('{esc}');
            cy.get('#toggleFormattingBarButton').focus();
            cy.get('#toggleFormattingBarButton').should('be.focused').and('have.attr', 'aria-label', 'formatting').tab();
            cy.get('#fileUploadButton').should('be.focused').and('have.attr', 'aria-label', 'attachment').tab();
            cy.get('#emojiPickerButton').should('be.focused').and('have.attr', 'aria-label', 'select an emoji').tab();
            cy.findByTestId('SendMessageButton').should('be.focused');
        });
    });
});
function verifySearchAutocomplete(index) {
    cy.get('#searchBox').find('.suggestion-list__item').eq(index).should('be.visible').
        and('have.class', 'suggestion--selected').
        invoke('attr', 'id').then((suggestionId) => {
            cy.get('#searchBox').find('[role="searchbox"]').should('have.attr', 'aria-activedescendant', suggestionId);
        });
}
function verifyMessageAutocomplete(index) {
    cy.get('#suggestionList').find('.suggestion-list__item').eq(index).should('be.visible').and('have.class', 'suggestion--selected');
    cy.get('#suggestionList').find('.suggestion-list__item').eq(index).invoke('attr', 'id').then((selectedId) => {
        cy.wrap(selectedId).should('not.equal', '');
        cy.uiGetPostTextBox().should('have.attr', 'aria-activedescendant', selectedId);
    });
}