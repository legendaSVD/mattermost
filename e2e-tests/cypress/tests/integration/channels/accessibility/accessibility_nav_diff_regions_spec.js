import {getRandomId} from '../../../utils';
function postMessages(testChannel, otherUser, count) {
    for (let index = 0; index < count; index++) {
        const message = `hello from current user: ${getRandomId()}`;
        cy.postMessage(message);
        const otherMessage = `hello from ${otherUser.username}: ${getRandomId()}`;
        cy.postMessageAs({sender: otherUser, message: otherMessage, channelId: testChannel.id});
    }
}
function verifyNavSupport(element, label, tabOrder) {
    cy.get(element).
        should('have.attr', 'aria-label', label).
        and('have.attr', 'data-a11y-sort-order', tabOrder).
        and('have.class', 'a11y__region a11y--active');
}
describe('Verify Quick Navigation support across different regions in the app', () => {
    let otherUser;
    let testChannel;
    before(() => {
        cy.apiInitSetup().then(({team, channel, user}) => {
            testChannel = channel;
            cy.apiCreateUser({prefix: 'other'}).then(({user: user1}) => {
                otherUser = user1;
                cy.apiAddUserToTeam(team.id, otherUser.id).then(() => {
                    cy.apiAddUserToChannel(testChannel.id, otherUser.id).then(() => {
                        cy.apiLogin(user);
                        cy.visit(`/${team.name}/channels/${testChannel.name}`);
                        postMessages(testChannel, otherUser, 5);
                    });
                });
            });
        });
    });
    it('MM-T1460_1 Verify Navigation Support in Post List & Post Input', () => {
        cy.uiGetPostTextBox().focus().tab({shift: true}).tab({shift: true});
        cy.get('body').type('{uparrow}{downarrow}');
        verifyNavSupport('#virtualizedPostListContent > div', 'message list main region', '1');
        cy.uiGetPostTextBox().focus().tab().tab({shift: true});
        verifyNavSupport('#advancedTextEditorCell', 'message input complementary region', '2');
    });
    it('MM-T1460_3 Verify Navigation Support in RHS Post List & RHS Post Input', () => {
        cy.getLastPostId().then((postId) => {
            cy.clickPostCommentIcon(postId);
            const replyMessage = 'A reply to an older post';
            cy.postMessageReplyInRHS(replyMessage);
        });
        cy.uiGetRHS().within(() => {
            cy.uiGetReplyTextBox().focus().tab({shift: true}).type('{uparrow}');
            verifyNavSupport('.post-right__content', 'message details complementary region', '3');
            cy.uiGetReplyTextBox().focus().tab().tab({shift: true});
            cy.get('#advancedTextEditorCell').
                should('have.attr', 'aria-label', 'message input complementary region').
                and('have.attr', 'data-a11y-sort-order', '2').
                and('have.class', 'a11y__region');
            cy.uiGetReplyTextBox().
                should('have.class', 'a11y--active a11y--focused');
        });
    });
    it('MM-T1460_5 Verify Navigation Support in LHS Sidebar', () => {
        cy.uiGetLHSAddChannelButton().focus().tab({shift: true}).tab();
        cy.focused().tab();
        verifyNavSupport('#lhsNavigator', 'channel navigator region', '6');
        cy.focused().tab().tab().tab().tab();
        verifyNavSupport('#sidebar-left', 'channel sidebar region', '7');
    });
    it('MM-T1460_6 Verify Navigation Support in Channel Header', () => {
        cy.get('#toggleFavorite').focus().tab({shift: true}).tab();
        verifyNavSupport('#channel-header', 'channel header region', '8');
    });
    it('MM-T1460_8 Verify Navigation Support in Search Results', () => {
        cy.uiGetSearchContainer().click();
        cy.uiGetSearchBox().should('be.visible').type('hello {enter}');
        cy.get('#searchContainer').within(() => {
            cy.get('button.sidebar--right__expand').focus().tab({shift: true}).tab();
            cy.focused().tab().tab().tab().tab();
        });
        cy.get('body').type('{downarrow}{uparrow}');
        verifyNavSupport('#search-items-container', 'Search Results complementary region', '3');
    });
});