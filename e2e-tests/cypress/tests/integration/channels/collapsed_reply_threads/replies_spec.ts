import {Channel} from '@mattermost/types/channels';
import {Team} from '@mattermost/types/teams';
import {UserProfile} from '@mattermost/types/users';
import {PostMessageResp} from 'tests/support/task_commands';
import * as TIMEOUTS from '../../../fixtures/timeouts';
describe('Collapsed Reply Threads', () => {
    let testTeam: Team;
    let testUser: UserProfile;
    let otherUser: UserProfile;
    let testChannel: Channel;
    let rootPost: PostMessageResp;
    let postForAvatar: PostMessageResp;
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
                    cy.postMessageAs({sender: otherUser, message: 'Root post', channelId: testChannel.id}).then((post) => {
                        rootPost = post;
                    });
                    cy.postMessageAs({sender: otherUser, message: 'Root post for clicking avatar', channelId: testChannel.id}).then((post) => {
                        postForAvatar = post;
                    });
                });
            });
        });
    });
    beforeEach(() => {
        cy.visit(`/${testTeam.name}/channels/${testChannel.name}`);
    });
    it('MM-T4142 should show number of replies in thread', () => {
        cy.uiWaitUntilMessagePostedIncludes(rootPost.data.message);
        cy.uiGetPostThreadFooter(rootPost.id).should('not.exist');
        cy.postMessageAs({sender: testUser, message: 'reply to root post', channelId: testChannel.id, rootId: rootPost.id});
        cy.uiGetPostThreadFooter(rootPost.id).within(() => {
            cy.get('.ReplyButton').should('have.text', '1 reply');
            cy.get('.Avatar').should('have.lengthOf', 1);
        });
        cy.uiClickSidebarItem('threads');
        cy.get('div.ThreadItem').find('.activity').should('have.text', '1 reply');
        cy.uiClickSidebarItem(testChannel.name);
        cy.postMessageAs({sender: testUser, message: 'another reply!', channelId: testChannel.id, rootId: rootPost.id});
        cy.uiGetPostThreadFooter(rootPost.id).within(() => {
            cy.get('.ReplyButton').should('have.text', '2 replies');
            cy.get('.Avatar').should('have.lengthOf', 1);
        });
        cy.uiClickSidebarItem('threads');
        cy.get('div.ThreadItem').find('.activity').should('have.text', '2 replies');
        cy.uiClickSidebarItem(testChannel.name);
        cy.postMessageAs({sender: otherUser, message: 'other reply!', channelId: testChannel.id, rootId: rootPost.id});
        cy.uiGetPostThreadFooter(rootPost.id).within(() => {
            cy.get('.ReplyButton').should('have.text', '3 replies');
            cy.get('.Avatar').should('have.lengthOf', 2);
        });
        cy.uiClickSidebarItem('threads');
        cy.get('div.ThreadItem').find('.activity').should('have.text', '1 new reply');
    });
    it('MM-T4646 should open popover when avatar is clicked', () => {
        cy.uiWaitUntilMessagePostedIncludes(postForAvatar.data.message);
        cy.postMessageAs({sender: testUser, message: 'reply!', channelId: testChannel.id, rootId: postForAvatar.id});
        cy.postMessageAs({sender: otherUser, message: 'another reply!', channelId: testChannel.id, rootId: postForAvatar.id});
        cy.uiGetPostThreadFooter(postForAvatar.id).find('.Avatars').find('button').first().click();
        cy.get('div.user-profile-popover').first().should('be.visible').find('button.btn-primary.btn-sm').type('{esc}');
        cy.uiClickSidebarItem('threads');
        cy.get('div.ThreadItem').find('.activity').find('.Avatars').find('button').first().click();
        cy.get('div.user-profile-popover').first().should('be.visible').find('button.btn-primary.btn-sm');
    });
    it('MM-T4143 Emoji reaction - type +:+1:', () => {
        cy.postMessage('Hello!');
        cy.getLastPostId().then((postId) => {
            cy.get(`#post_${postId}`).click();
            cy.postMessageReplyInRHS('+:+1:');
            cy.get(`#${postId}_message`).within(() => {
                cy.findByLabelText('reactions').should('be.visible');
                cy.findByRole('button', {name: /reacted with :\+1:/i}).should('be.visible');
            });
            cy.uiGetPostThreadFooter(postId).should('not.exist');
            cy.uiCloseRHS();
        });
    });
    it('MM-T5413 should auto-scroll to bottom upon pasting long text in reply', () => {
        cy.postMessageAs({
            sender: testUser,
            message: 'Another interesting post,',
            channelId: testChannel.id,
        }).then(({id: rootId}) => {
            Cypress._.times(20, (i) => {
                cy.postMessageAs({
                    sender: otherUser,
                    message: 'Reply ' + i,
                    channelId: testChannel.id,
                    rootId,
                });
            });
            cy.get(`#post_${rootId}`).click();
            cy.wait(TIMEOUTS.ONE_SEC);
            cy.get('#rhsContainer').findByTestId('SendMessageButton').should('be.visible');
            cy.uiCloseRHS();
            cy.get(`#post_${rootId}`).click();
            const text = 'word '.repeat(2000);
            cy.get('#rhsContainer').findByTestId('reply_textbox').clear().invoke('val', text).trigger('input');
            cy.get('#rhsContainer').findByTestId('SendMessageButton').scrollIntoView().should('be.visible');
        });
    });
});