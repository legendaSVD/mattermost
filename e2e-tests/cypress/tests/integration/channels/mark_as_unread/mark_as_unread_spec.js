import {beRead, beUnread} from '../../../support/assertions';
import {verifyPostNextToNewMessageSeparator, verifyTopSpaceForNewMessage, verifyBottomSpaceForNewMessage, switchToChannel, showCursor, notShowCursor} from './helpers';
describe('Mark as Unread', () => {
    let testUser;
    let team1;
    let channelA;
    let channelB;
    let post1;
    let post2;
    let post3;
    beforeEach(() => {
        cy.apiAdminLogin();
        cy.apiInitSetup().then(({team, channel, user}) => {
            team1 = team;
            testUser = user;
            channelA = channel;
            cy.apiCreateChannel(team1.id, 'channel-b', 'Channel B').then((out) => {
                channelB = out.channel;
                cy.apiAddUserToChannel(channelB.id, testUser.id);
            });
            cy.apiCreateUser().then(({user: user2}) => {
                const otherUser = user2;
                cy.apiAddUserToTeam(team1.id, otherUser.id).then(() => {
                    cy.apiAddUserToChannel(channelA.id, otherUser.id);
                    cy.postMessageAs({
                        sender: otherUser,
                        message: 'post1',
                        channelId: channelA.id,
                    }).then((p1) => {
                        post1 = p1;
                        cy.postMessageAs({
                            sender: otherUser,
                            message: 'post2',
                            channelId: channelA.id,
                        }).then((p2) => {
                            post2 = p2;
                            cy.postMessageAs({
                                sender: otherUser,
                                message: 'post3',
                                channelId: channelA.id,
                                rootId: post1.id,
                            }).then((post) => {
                                post3 = post;
                            });
                        });
                    });
                });
            });
            cy.apiLogin(testUser);
            cy.visit(`/${team1.name}/channels/town-square`);
        });
    });
    it('Channel should appear unread after switching away from channel and be read after switching back', () => {
        cy.get(`#sidebarItem_${channelA.name}`).should(beUnread);
        switchToChannel(channelA);
        cy.get(`#sidebarItem_${channelA.name}`).should(beRead);
        markAsUnreadFromPost(post2);
        cy.get(`#sidebarItem_${channelA.name}`).should(beUnread);
        switchToChannel(channelB);
        cy.get(`#sidebarItem_${channelA.name}`).should(beUnread);
        switchToChannel(channelA);
        cy.get(`#sidebarItem_${channelA.name}`).should(beRead);
    });
    it('MM-T5223 The latest post should appear unread after marking the channel as unread', () => {
        cy.get(`#sidebarItem_${channelA.name}`).should(beUnread);
        switchToChannel(channelA);
        cy.get(`#sidebarItem_${channelA.name}`).should(beRead);
        switchToChannel(channelB);
        cy.get(`#sidebarItem_${channelA.name}`).find('.SidebarMenu').click({force: true});
        cy.get(`#markAsUnread-${channelA.id}`).click();
        cy.get(`#sidebarItem_${channelA.name}`).should(beUnread);
        cy.get(`#sidebarItem_${channelA.name}`).click();
        verifyPostNextToNewMessageSeparator('post3');
    });
    it('MM-T5224 The latest post should appear unread after marking the channel as unread with alt/option+left-click on channel sidebar item', () => {
        cy.get(`#sidebarItem_${channelA.name}`).should(beUnread);
        switchToChannel(channelA);
        cy.get(`#sidebarItem_${channelA.name}`).should(beRead);
        switchToChannel(channelB);
        cy.get(`#sidebarItem_${channelA.name}`).type('{alt}', {release: false}).click();
        cy.get(`#sidebarItem_${channelA.name}`).should(beUnread);
        cy.get(`#sidebarItem_${channelA.name}`).click();
        verifyPostNextToNewMessageSeparator('post3');
    });
    it('MM-T257 Mark as Unread when bringing window into focus', () => {
        cy.get(`#sidebarItem_${channelA.name}`).should(beUnread);
        cy.get(`#sidebarItem_${channelB.name}`).should(beUnread);
        cy.visit(`/${team1.name}/integrations/`);
        cy.visit(`/${team1.name}/channels/town-square`);
        cy.get(`#sidebarItem_${channelA.name}`).should(beUnread);
        cy.get(`#sidebarItem_${channelB.name}`).should(beUnread);
        switchToChannel(channelA);
        switchToChannel(channelB);
        cy.get(`#sidebarItem_${channelA.name}`).should(beRead);
        cy.get(`#sidebarItem_${channelB.name}`).should(beRead);
    });
    it('New messages line should remain after switching back to channel', () => {
        switchToChannel(channelA);
        cy.get('.NotificationSeparator').should('not.exist');
        markAsUnreadFromPost(post2);
        cy.get('.NotificationSeparator').should('exist');
        switchToChannel(channelB);
        switchToChannel(channelA);
        cy.get('.NotificationSeparator').should('exist');
        switchToChannel(channelB);
        switchToChannel(channelA);
        cy.get('.NotificationSeparator').should('not.exist');
    });
    it('MM-T260 Mark as Unread New Messages line extra space moves with it', () => {
        switchToChannel(channelA);
        markAsUnreadFromPost(post2);
        verifyPostNextToNewMessageSeparator('post2');
        verifyTopSpaceForNewMessage('post2');
        verifyBottomSpaceForNewMessage('post1');
        markAsUnreadFromPost(post1);
        verifyPostNextToNewMessageSeparator('post1');
        verifyTopSpaceForNewMessage('post1');
        verifyBottomSpaceForNewMessage('System');
        markAsUnreadFromPost(post3);
        verifyPostNextToNewMessageSeparator('post3');
        verifyTopSpaceForNewMessage('post3');
        verifyBottomSpaceForNewMessage('post2');
    });
    it('Should be able to mark channel as unread by alt-clicking on RHS', () => {
        switchToChannel(channelA);
        cy.get(`#CENTER_commentIcon_${post3.id}`).click({force: true});
        markAsUnreadFromPost(post1, true);
        verifyPostNextToNewMessageSeparator('post1');
        markAsUnreadFromPost(post3, true);
        verifyPostNextToNewMessageSeparator('post3');
    });
    it('Should show cursor pointer when holding down alt', () => {
        const componentIds = [
            `#post_${post1.id}`,
            `#post_${post2.id}`,
            `#post_${post3.id}`,
            `#rhsPost_${post1.id}`,
            `#rhsPost_${post3.id}`,
        ];
        switchToChannel(channelA);
        cy.get(`#CENTER_commentIcon_${post3.id}`).click({force: true});
        for (const componentId of componentIds) {
            cy.get(componentId).trigger('mouseover').should(notShowCursor);
            cy.get(componentId).trigger('keydown', {altKey: true}).should(showCursor);
            cy.get(componentId).trigger('keydown', {altKey: false}).should(notShowCursor);
            cy.get(componentId).trigger('mouseout');
        }
        for (const componentId of componentIds) {
            cy.get(componentId).trigger('mouseover', {altKey: true}).should(showCursor);
            cy.get(componentId).trigger('mouseout', {altKey: true}).should(notShowCursor);
        }
    });
    it('Marking a channel as unread from another session while viewing channel', () => {
        switchToChannel(channelA);
        cy.get(`#sidebarItem_${channelA.name}`).should(beRead);
        markAsUnreadFromAnotherSession(post2, testUser);
        cy.get(`#sidebarItem_${channelA.name}`).should(beUnread);
        verifyPostNextToNewMessageSeparator('post2');
        switchToChannel(channelB);
        cy.get(`#sidebarItem_${channelA.name}`).should(beUnread);
        switchToChannel(channelA);
        cy.get(`#sidebarItem_${channelA.name}`).should(beRead);
        verifyPostNextToNewMessageSeparator('post2');
    });
    it('Marking a channel as unread from another session while viewing another channel', () => {
        switchToChannel(channelA);
        switchToChannel(channelB);
        cy.get(`#sidebarItem_${channelA.name}`).should(beRead);
        markAsUnreadFromAnotherSession(post2, testUser);
        cy.get(`#sidebarItem_${channelA.name}`).should(beUnread);
        switchToChannel(channelA);
        cy.get(`#sidebarItem_${channelA.name}`).should(beRead);
        verifyPostNextToNewMessageSeparator('post2');
    });
    it('MM-T244 Webapp: Post menu item `Mark as Unread` appearance', () => {
        switchToChannel(channelA);
        cy.get(`#sidebarItem_${channelA.name}`).should(beRead);
        postMessage(post1.message);
        cy.getLastPostId().then((postId) => {
            cy.clickPostDotMenu(postId);
            cy.get('ul.Menu__content.dropdown-menu').
                as('menuOptions').
                should('be.visible').
                scrollIntoView();
            cy.get('@menuOptions').
                find('[aria-label="Mark as Unread"]').
                as('markAsReadElement').
                should('be.visible');
            cy.viewport('iphone-5');
            cy.get('@markAsReadElement').should('be.visible');
            cy.findByText('Edit').should('not.exist');
            cy.findByText('Delete').should('not.exist');
            cy.get('ul.Menu__content').find('li.MenuItem').each(($listElement) => {
                cy.wrap($listElement).find('button').then(($buttonElement) => {
                    cy.wrap($buttonElement).invoke('attr', 'aria-label').then((ariaLabel) => {
                        if (ariaLabel !== 'Copy Text') {
                            cy.wrap($buttonElement).should('have.css', 'border-color', 'rgba(63, 67, 80, 0.12)');
                        }
                    });
                });
            });
        });
    });
    it('Should be able to mark channel as unread from post menu', () => {
        switchToChannel(channelA);
        cy.uiClickPostDropdownMenu(post2.id, 'Mark as Unread');
        verifyPostNextToNewMessageSeparator('post2');
        cy.uiClickPostDropdownMenu(post1.id, 'Mark as Unread');
        verifyPostNextToNewMessageSeparator('post1');
        cy.uiClickPostDropdownMenu(post3.id, 'Mark as Unread');
        verifyPostNextToNewMessageSeparator('post3');
    });
    it('Should be able to mark channel as unread from RHS post menu', () => {
        switchToChannel(channelA);
        cy.get(`#CENTER_commentIcon_${post3.id}`).click({force: true});
        cy.uiClickPostDropdownMenu(post1.id, 'Mark as Unread', 'RHS_ROOT');
        verifyPostNextToNewMessageSeparator('post1');
        cy.uiClickPostDropdownMenu(post3.id, 'Mark as Unread', 'RHS_COMMENT');
        verifyPostNextToNewMessageSeparator('post3');
    });
    it('MM-T250 Mark as unread in the RHS', () => {
        switchToChannel(channelA);
        cy.clickPostCommentIcon(post1.id);
        cy.uiClickPostDropdownMenu(post1.id, 'Mark as Unread', 'RHS_ROOT');
        verifyPostNextToNewMessageSeparator('post1');
        cy.get(`#sidebarItem_${channelA.name}`).should(beUnread);
        cy.get('#rhsContainer').find('.NotificationSeparator').should('not.exist');
        switchToChannel(channelB);
        switchToChannel(channelA);
        cy.get(`#sidebarItem_${channelA.name}`).should(beRead);
        cy.get(`#post_${post2.id}`).trigger('mouseover').type('{alt}', {release: false}).should(showCursor);
        cy.get(`#post_${post2.id}`).type('{alt}', {release: false}).click();
        verifyPostNextToNewMessageSeparator('post2');
        cy.get(`#sidebarItem_${channelA.name}`).should(beUnread);
        cy.get('#rhsContainer').find('.NotificationSeparator').should('not.exist');
        switchToChannel(channelB);
        switchToChannel(channelA);
        cy.get(`#sidebarItem_${channelA.name}`).should(beRead);
    });
});
function markAsUnreadFromPost(post, rhs = false) {
    const prefix = rhs ? 'rhsPost' : 'post';
    cy.get('body').type('{alt}', {release: false});
    cy.get(`#${prefix}_${post.id}`).click({force: true});
    cy.get('body').type('{alt}', {release: true});
}
function markAsUnreadFromAnotherSession(post, user) {
    cy.externalRequest({
        user,
        method: 'post',
        path: `users/${user.id}/posts/${post.id}/set_unread`,
    });
}