import {Channel} from '@mattermost/types/channels';
import {Team} from '@mattermost/types/teams';
import {UserProfile} from '@mattermost/types/users';
import * as TIMEOUTS from '../../../fixtures/timeouts';
import {isMac} from '../../../utils';
import {ChainableT} from '../../../types';
describe('Collapsed Reply Threads', () => {
    let testTeam: Team;
    let testUser: UserProfile;
    let otherUser: UserProfile;
    let testChannel: Channel;
    before(() => {
        cy.apiUpdateConfig({
            ServiceSettings: {
                ThreadAutoFollow: true,
                CollapsedThreads: 'default_off',
            },
        });
        cy.apiInitSetup({loginAfter: true, promoteNewUserAsAdmin: true}).then(({team, channel, user}) => {
            testTeam = team;
            testUser = user;
            testChannel = channel;
            cy.apiSaveCRTPreference(testUser.id, 'on');
            cy.apiCreateUser({prefix: 'other'}).then(({user: user1}) => {
                otherUser = user1;
                cy.apiAddUserToTeam(testTeam.id, otherUser.id).then(() => {
                    cy.apiAddUserToChannel(testChannel.id, otherUser.id);
                });
            });
        });
    });
    beforeEach(() => {
        cy.visit(`/${testTeam.name}/channels/${testChannel.name}`);
    });
    it('MM-T4141_1 should follow a thread after replying', () => {
        cy.postMessageAs({
            sender: otherUser,
            message: 'Root post,',
            channelId: testChannel.id,
        }).then(({id: rootId}) => {
            cy.get(`#post_${rootId}`).find('.ThreadFooter').should('not.exist');
            cy.get(`#post_${rootId}`).click();
            cy.get('#rhsContainer').find('.FollowButton').should('have.text', 'Follow');
            cy.postMessageReplyInRHS('Reply!');
            cy.get(`#post_${rootId}`).
                get('.ThreadFooter').should('exist').
                within(() => {
                    cy.get('.FollowButton').should('have.text', 'Following');
                });
            cy.get('#rhsContainer').find('.FollowButton').should('have.text', 'Following');
            cy.uiClickSidebarItem('threads');
            cy.get('div.ThreadItem').should('have.have.lengthOf', 1);
        });
    });
    it('MM-T4141_2 should follow a thread after marking it as unread', () => {
        postMessageWithReply(testChannel.id, otherUser, 'Another interesting post,', otherUser, 'Self reply!').then(({rootId, replyId}) => {
            cy.get(`#post_${rootId}`).within(() => {
                cy.get('.ThreadFooter').should('exist').
                    find('.FollowButton').should('have.text', 'Follow');
            });
            cy.get(`#post_${rootId}`).click();
            cy.get('#rhsContainer').find('.FollowButton').should('have.text', 'Follow');
            cy.uiClickPostDropdownMenu(replyId, 'Mark as Unread', 'RHS_COMMENT');
            cy.get('#rhsContainer').find('.FollowButton').should('have.text', 'Following');
            cy.get(`#post_${rootId}`).within(() => {
                cy.get('.ThreadFooter').should('exist').
                    find('.FollowButton').should('have.text', 'Following');
            });
            cy.uiClickSidebarItem('threads');
            cy.get('div.ThreadItem').should('have.have.lengthOf', 2);
        });
    });
    it('MM-T4141_3 clicking "Following" button in the footer should unfollow the thread', () => {
        postMessageWithReply(testChannel.id, otherUser, 'Another interesting post,', testUser, 'Self reply!');
        cy.getLastPostId().then((rootId) => {
            cy.get(`#post_${rootId}`).click();
            cy.get('#rhsContainer').find('.FollowButton').should('have.text', 'Following');
            cy.get(`#post_${rootId}`).within(() => {
                cy.get('.ThreadFooter').should('exist');
                cy.get('.FollowButton').should('have.text', 'Following');
                cy.get('.FollowButton').click({force: true});
                cy.get('.FollowButton').should('have.text', 'Follow');
            });
            cy.get('#rhsContainer').find('.FollowButton').should('have.text', 'Follow');
            cy.uiCloseRHS();
        });
    });
    it('MM-T4141_4 clicking "Follow" button in the footer should follow the thread', () => {
        postMessageWithReply(testChannel.id, otherUser, 'Another interesting post,', otherUser, 'Self reply!');
        cy.getLastPostId().then((rootId) => {
            cy.get(`#post_${rootId}`).click();
            cy.get('#rhsContainer').find('.FollowButton').should('have.text', 'Follow');
            cy.get(`#post_${rootId}`).within(() => {
                cy.get('.ThreadFooter').should('exist');
                cy.get('.FollowButton').should('have.text', 'Follow');
                cy.get('.FollowButton').click({force: true});
                cy.get('.FollowButton').should('have.text', 'Following');
            });
            cy.get('#rhsContainer').find('.FollowButton').should('have.text', 'Following');
            cy.uiCloseRHS();
        });
    });
    it('MM-T4682 should show search guidance at the end of the list after scroll loading', () => {
        for (let i = 1; i <= 30; i++) {
            postMessageWithReply(testChannel.id, otherUser, `Another interesting post ${i}`, testUser, `Another reply ${i}!`).then(({rootId}) => {
                if (i === 30) {
                    cy.get(`#post_${rootId}`).click();
                    cy.uiClickPostDropdownMenu(rootId, 'Mark as Unread', 'RHS_ROOT');
                }
            });
        }
        cy.uiClickSidebarItem('threads');
        const maxScrolls = 3;
        scrollThreadsListToEnd(maxScrolls);
        cy.get('.ThreadList .no-results__wrapper').should('be.visible').within(() => {
            cy.findByText('That’s the end of the list').should('be.visible');
            cy.contains('If you’re looking for older conversations, try searching with ').should('be.visible').within(() => {
                cy.findByText(isMac() ? '⌘' : 'Ctrl').should('be.visible');
                cy.findByText('Shift').should('be.visible');
                cy.findByText('F').should('be.visible');
            });
        });
        cy.findByText('Unreads').click();
        cy.get('.ThreadList .no-results__wrapper').should('not.exist');
    });
});
function postMessageWithReply(channelId, postSender, postMessage, replySender, replyMessage): ChainableT {
    return cy.postMessageAs({
        sender: postSender,
        message: postMessage || 'Another interesting post.',
        channelId,
    }).then(({id: rootId}) => {
        cy.postMessageAs({
            sender: replySender || postSender,
            message: replyMessage || 'Another reply!',
            channelId,
            rootId,
        }).then(({id: replyId}) => (Promise.resolve({rootId, replyId})));
    });
}
function scrollThreadsListToEnd(maxScrolls = 1, scrolls = 0): ChainableT<void> {
    if (scrolls === maxScrolls) {
        return;
    }
    cy.get('.ThreadList .virtualized-thread-list').scrollTo('bottom').then(($el) => {
        const element = $el.find('.no-results__wrapper');
        if (element.length < 1) {
            cy.wait(TIMEOUTS.ONE_SEC).then(() => {
                scrollThreadsListToEnd(maxScrolls, scrolls + 1);
            });
        } else {
            cy.wrap(element).scrollIntoView();
        }
    });
}