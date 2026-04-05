import {getRandomId} from '../../../utils';
function postMessages(testChannel, otherUser, count) {
    for (let index = 0; index < count; index++) {
        const message = `hello from current user: ${getRandomId()}`;
        cy.postMessage(message);
        const otherMessage = `hello from ${otherUser.username}: ${getRandomId()}`;
        cy.postMessageAs({sender: otherUser, message: otherMessage, channelId: testChannel.id});
    }
}
describe('Verify Accessibility keyboard usability across different regions in the app', () => {
    const count = 5;
    let testUser;
    let otherUser;
    let testChannel;
    before(() => {
        cy.apiInitSetup().then(({team, channel, user}) => {
            testUser = user;
            testChannel = channel;
            cy.apiCreateUser({prefix: 'other'}).then(({user: user1}) => {
                otherUser = user1;
                cy.apiAddUserToTeam(team.id, otherUser.id).then(() => {
                    cy.apiAddUserToChannel(testChannel.id, otherUser.id).then(() => {
                        cy.apiLogin(user);
                        cy.visit(`/${team.name}/channels/${testChannel.name}`);
                    });
                });
            });
        });
    });
    it('MM-T1513_2 Verify Keyboard support in Search Results', () => {
        postMessages(testChannel, otherUser, count);
        cy.uiGetSearchContainer().click();
        cy.uiGetSearchBox().typeWithForce('hello').typeWithForce('{enter}');
        cy.get('#searchContainer').within(() => {
            cy.get('button.sidebar--right__expand').focus().tab({shift: true}).tab();
            cy.focused().tab().tab();
        });
        cy.get('body').type('{rightarrow}').wait(100);
        cy.get('#filesTab').should('have.class', 'a11y--active a11y--focused');
        cy.get('body').type('{leftarrow}').wait(100);
        cy.get('#messagesTab').should('have.class', 'a11y--active a11y--focused');
        cy.focused().tab();
        cy.get('#searchTeamsSelectorMenuButton').should('have.class', 'a11y--active a11y--focused');
        cy.focused().tab();
        cy.get('body').type('{downarrow}{uparrow}');
        for (let index = 0; index < count; index++) {
            cy.get('.files-or-messages-panel').children('.search-item__container').eq(index).then(($el) => {
                cy.get($el).find('.post').should('have.class', 'a11y--active a11y--focused');
                cy.get('body').type('{downarrow}');
            });
        }
        for (let index = count; index > 0; index--) {
            cy.get('.files-or-messages-panel').children('.search-item__container').eq(index).then(($el) => {
                cy.get($el).find('.post').should('have.class', 'a11y--active a11y--focused');
                cy.get('body').type('{uparrow}');
            });
        }
    });
    it('MM-T1513_1 Verify Keyboard support in RHS', () => {
        const message = `hello from ${testUser.username}: ${getRandomId()}`;
        cy.postMessage(message);
        cy.getLastPostId().then((postId) => {
            cy.clickPostCommentIcon(postId);
            cy.get('#rhsContainer').should('be.visible');
            for (let index = 0; index < count; index++) {
                const replyMessage = `A reply ${getRandomId()}`;
                cy.postMessageReplyInRHS(replyMessage);
                const messageFromOther = `reply from ${otherUser.username}: ${getRandomId()}`;
                cy.postMessageAs({sender: otherUser, message: messageFromOther, channelId: testChannel.id, rootId: postId});
            }
        });
        cy.get('#rhsContainer .post-right__content').should('have.attr', 'data-a11y-order-reversed', 'true').and('have.attr', 'data-a11y-focus-child', 'true');
        cy.get('#rhsContainer').within(() => {
            cy.uiGetReplyTextBox().focus().tab({shift: true});
        });
        cy.get('body').type('{uparrow}{downarrow}');
        const total = (count * 2) + 1;
        let row = total - 1;
        for (let index = count; index > 0; index--) {
            cy.get('#rhsContainer .post-right-comments-container .post').eq(row).then(($el) => {
                cy.get($el).should('have.class', 'a11y--active a11y--focused');
                cy.get('body').type('{uparrow}');
            });
            row--;
        }
        for (let index = count; index > 0; index--) {
            cy.get('#rhsContainer .post-right-comments-container .post').eq(row).then(($el) => {
                cy.get($el).should('have.class', 'a11y--active a11y--focused');
                cy.get('body').type('{downarrow}');
            });
            row++;
        }
    });
    it('MM-T1499 Verify Screen reader should not switch to virtual cursor mode', () => {
        cy.getLastPostId().then((postId) => {
            cy.clickPostCommentIcon(postId);
            const regions = ['#sidebar-left', '#rhsContainer .post-right__content', '#advancedTextEditorCell'];
            regions.forEach((region) => {
                cy.get(region).should('have.attr', 'role', 'application');
            });
            cy.get('.search__form').should('have.attr', 'role', 'search');
        });
    });
});