import {Channel} from '@mattermost/types/channels';
import {Team} from '@mattermost/types/teams';
import {UserProfile} from '@mattermost/types/users';
import {PostMessageResp} from 'tests/support/task_commands';
describe('Collapsed Reply Threads', () => {
    let testTeam: Team;
    let testChannel: Channel;
    let user1: UserProfile;
    let user2: UserProfile;
    let user3: UserProfile;
    let rootPost: PostMessageResp;
    let replyPost1: PostMessageResp;
    let replyPost2: PostMessageResp;
    const messages = {
        ROOT: 'ROOT POST',
        REPLY1: 'REPLY 1',
        REPLY2: 'REPLY 2',
    };
    before(() => {
        cy.apiUpdateConfig({
            ServiceSettings: {
                ThreadAutoFollow: true,
                CollapsedThreads: 'default_off',
            },
        });
        cy.apiInitSetup({loginAfter: true, promoteNewUserAsAdmin: true}).then(({team, channel, user}) => {
            testTeam = team;
            user1 = user;
            testChannel = channel;
            cy.apiSaveCRTPreference(user1.id, 'on');
            cy.apiCreateUser({prefix: 'user2'}).then(({user: newUser}) => {
                user2 = newUser;
                cy.apiAddUserToTeam(testTeam.id, user2.id).then(() => {
                    cy.apiAddUserToChannel(testChannel.id, user2.id);
                });
            });
            cy.apiCreateUser({prefix: 'user3'}).then(({user: newUser}) => {
                user3 = newUser;
                cy.apiAddUserToTeam(testTeam.id, user3.id).then(() => {
                    cy.apiAddUserToChannel(testChannel.id, user3.id);
                });
            });
        });
    });
    beforeEach(() => {
        cy.visit(`/${testTeam.name}/channels/${testChannel.name}`);
        cy.postMessageAs({sender: user1, message: messages.ROOT, channelId: testChannel.id}).then((post) => {
            rootPost = post;
        });
    });
    it('MM-T4379 Display: Click to open threads', () => {
        cy.uiWaitUntilMessagePostedIncludes(rootPost.data.message);
        cy.getLastPost().click();
        cy.get(`#rhsPost_${rootPost.id}`).should('be.visible');
        cy.uiCloseRHS();
        cy.uiOpenSettingsModal('Display');
        cy.get('#click_to_replyTitle').click();
        cy.get('#click_to_replyFormatB').click();
        cy.get('#saveSetting').click();
        cy.uiClose();
        cy.visit(`/${testTeam.name}/channels/${testChannel.name}`);
        cy.getLastPost().click();
        cy.get(`rhsPost_${rootPost.id}`).should('not.exist');
        cy.apiDeletePost(rootPost.id);
    });
    it('MM-T4445 CRT - Delete root post', () => {
        cy.uiWaitUntilMessagePostedIncludes(rootPost.data.message);
        cy.uiGetPostThreadFooter(rootPost.id).should('not.exist');
        cy.postMessageAs({sender: user2, message: messages.REPLY1, channelId: testChannel.id, rootId: rootPost.id});
        cy.uiClickSidebarItem('threads');
        cy.get('div.ThreadItem').should('have.lengthOf', 1);
        cy.apiDeletePost(rootPost.id);
        cy.get('div.ThreadItem').should('have.lengthOf', 1).should('contain.text', '(message deleted)');
        cy.reload(true);
        cy.get('div.ThreadItem').should('have.lengthOf', 0);
    });
    it('MM-T4446 CRT - Delete single reply post on a thread', () => {
        cy.uiWaitUntilMessagePostedIncludes(rootPost.data.message);
        cy.uiGetPostThreadFooter(rootPost.id).should('not.exist');
        cy.postMessageAs({sender: user1, message: messages.REPLY1, channelId: testChannel.id, rootId: rootPost.id}).then((post) => {
            replyPost1 = post;
            cy.uiClickSidebarItem('threads');
            cy.get('div.ThreadItem').should('have.lengthOf', 1).first().click();
            cy.get(`#rhsPostMessageText_${replyPost1.id}`).should('be.visible').should('contain.text', messages.REPLY1);
            cy.apiDeletePost(replyPost1.id);
            cy.get('div.ThreadItem').should('have.lengthOf', 1);
            cy.get(`#rhsPost_${replyPost1.id}`).should('be.visible').should('contain.text', '(message deleted)');
            cy.reload(true);
            cy.get('div.ThreadItem').should('have.lengthOf', 0);
            cy.get(`#rhsPost_${replyPost1.id}`).should('not.exist');
            cy.apiDeletePost(rootPost.id);
        });
    });
    it('MM-T4447 CRT - Delete single reply post on a multi-reply thread', () => {
        cy.uiWaitUntilMessagePostedIncludes(rootPost.data.message);
        cy.uiGetPostThreadFooter(rootPost.id).should('not.exist');
        cy.postMessageAs({sender: user2, message: messages.REPLY1, channelId: testChannel.id, rootId: rootPost.id}).then((post) => {
            replyPost1 = post;
        }).then(() => {
            return cy.postMessageAs({sender: user3, message: messages.REPLY2, channelId: testChannel.id, rootId: rootPost.id});
        }).then((post) => {
            replyPost2 = post;
            cy.uiGetPostThreadFooter(rootPost.id).within(() => {
                cy.get('.ReplyButton').should('have.text', '2 replies');
                cy.get('.Avatar').should('have.lengthOf', 2);
            });
            cy.uiClickSidebarItem('threads');
            cy.get('div.ThreadItem').should('have.lengthOf', 1).first().click().within(() => {
                cy.get('.activity').should('have.text', '2 replies');
                cy.get('.Avatar').should('have.lengthOf', 3);
            });
            cy.get(`#rhsPost_${replyPost2.id}`).should('be.visible').should('contain.text', messages.REPLY2);
            cy.apiDeletePost(replyPost2.id);
            cy.reload(true);
            cy.get('div.ThreadItem').should('have.lengthOf', 1).first().click().within(() => {
                cy.get('.activity').should('have.text', '1 reply');
                cy.get('.Avatar').should('have.lengthOf', 2);
            });
            cy.visit(`/${testTeam.name}/channels/${testChannel.name}`);
            cy.uiGetPostThreadFooter(rootPost.id).within(() => {
                cy.get('.ReplyButton').should('have.text', '1 reply');
                cy.get('.Avatar').should('have.lengthOf', 1);
            });
            cy.apiDeletePost(rootPost.id);
        });
    });
    it('MM-T4448_1 CRT - L16 - Use “Mark all as read” button', () => {
        cy.uiWaitUntilMessagePostedIncludes(rootPost.data.message);
        cy.uiGetPostThreadFooter(rootPost.id).should('not.exist');
        cy.postMessageAs({sender: user2, message: messages.REPLY1, channelId: testChannel.id, rootId: rootPost.id}).then((post) => {
            replyPost1 = post;
            cy.uiGetPostThreadFooter(rootPost.id).within(() => {
                cy.get('.ReplyButton').should('have.text', '1 reply');
                cy.get('.Avatar').should('have.lengthOf', 1);
            });
            cy.uiClickSidebarItem('threads');
            cy.get('#threads-list-unread-button .dot').should('have.lengthOf', 1);
            cy.get('div.ThreadItem').should('have.lengthOf', 1).within(() => {
                cy.get('.dot-unreads').should('have.lengthOf', 1);
                cy.get('.activity').should('have.text', '1 new reply');
            });
            cy.get('#threads-list__mark-all-as-read').click();
            cy.get('#mark-all-threads-as-read-modal').should('exist');
            cy.get('button.confirm').contains('Mark all as read').click();
            cy.get('#mark-all-threads-as-read-modal').should('not.exist');
            cy.get('#threads-list-unread-button .dot').should('not.exist');
            cy.get('div.ThreadItem').should('have.lengthOf', 1).within(() => {
                cy.get('.dot-unreads').should('have.lengthOf', 0);
                cy.get('.activity').should('have.text', '1 reply');
            });
            cy.get('.no-results__holder').should('contain.text', 'Looks like you’re all caught up');
            cy.apiDeletePost(rootPost.id);
        });
    });
    it('MM-T4448_2 CRT - L16 - Cancel “Mark all as unread” modal', () => {
        cy.uiWaitUntilMessagePostedIncludes(rootPost.data.message);
        cy.uiGetPostThreadFooter(rootPost.id).should('not.exist');
        cy.postMessageAs({sender: user2, message: messages.REPLY1, channelId: testChannel.id, rootId: rootPost.id}).then((post) => {
            replyPost1 = post;
            cy.uiClickSidebarItem('threads');
            cy.get('#threads-list-unread-button .dot').should('have.lengthOf', 1);
            cy.get('div.ThreadItem').should('have.lengthOf', 1).within(() => {
                cy.get('.dot-unreads').should('have.lengthOf', 1);
                cy.get('.activity').should('have.text', '1 new reply');
            });
            cy.get('#threads-list__mark-all-as-read').click();
            cy.get('#mark-all-threads-as-read-modal').should('exist');
            cy.get('.btn-tertiary').contains('Cancel').click();
            cy.get('#mark-all-threads-as-read-modal').should('not.exist');
            cy.get('#threads-list-unread-button .dot').should('exist');
            cy.get('#threads-list__mark-all-as-read').click();
            cy.get('#mark-all-threads-as-read-modal').should('exist');
            cy.get('button.close').click();
            cy.get('#mark-all-threads-as-read-modal').should('not.exist');
            cy.get('#threads-list-unread-button .dot').should('exist');
            cy.get('#threads-list__mark-all-as-read').click();
            cy.get('body').type('{esc}');
            cy.get('#mark-all-threads-as-read-modal').should('not.exist');
            cy.get('#threads-list-unread-button .dot').should('exist');
            cy.get('div.ThreadItem').should('have.lengthOf', 1).within(() => {
                cy.get('.dot-unreads').should('have.lengthOf', 1);
                cy.get('.activity').should('have.text', '1 new reply');
            });
        });
        cy.get('.no-results__holder').should('not.contain.text', 'Looks like you’re all caught up');
        cy.apiDeletePost(rootPost.id);
    });
    it('CRT - Threads list keyboard navigation', () => {
        let firstRoot;
        let firstReply;
        let secondRoot;
        let secondReply;
        let thirdRoot;
        let thirdReply;
        cy.postMessageAs({sender: user1, message: messages.ROOT + '1', channelId: testChannel.id}).then((post) => {
            firstRoot = post;
            cy.postMessageAs({sender: user2, message: messages.REPLY1 + '1', channelId: testChannel.id, rootId: firstRoot.id}).then((reply) => {
                firstReply = reply;
            });
        }).then(() => {
            cy.postMessageAs({sender: user1, message: messages.ROOT + '1', channelId: testChannel.id}).then((post) => {
                secondRoot = post;
                cy.postMessageAs({sender: user2, message: messages.REPLY1 + '1', channelId: testChannel.id, rootId: secondRoot.id}).then((reply) => {
                    secondReply = reply;
                });
            });
        }).then(() => {
            cy.postMessageAs({sender: user1, message: messages.ROOT + '1', channelId: testChannel.id}).then((post) => {
                thirdRoot = post;
                cy.postMessageAs({sender: user2, message: messages.REPLY1 + '1', channelId: testChannel.id, rootId: thirdRoot.id}).then((reply) => {
                    thirdReply = reply;
                });
            });
        }).then(() => {
            cy.get('a').contains('Threads').click();
            cy.get('div.ThreadItem').should('have.lengthOf', 3);
            cy.contains('Catch up on your threads').should('be.visible');
            cy.get('body').type('{downArrow}');
            cy.contains('Catch up on your threads').should('not.exist');
            cy.get(`#rhsPost_${thirdRoot.id}`).should('be.visible');
            cy.get(`#rhsPost_${thirdReply.id}`).should('be.visible');
            cy.focused().should('not.have.id', 'reply_textbox');
            cy.get('body').type('{downArrow}');
            cy.get(`#rhsPost_${secondRoot.id}`).should('be.visible');
            cy.get(`#rhsPost_${secondReply.id}`).should('be.visible');
            cy.focused().should('not.have.id', 'reply_textbox');
            cy.get('body').type('{downArrow}');
            cy.get(`#rhsPost_${firstRoot.id}`).should('be.visible');
            cy.get(`#rhsPost_${firstReply.id}`).should('be.visible');
            cy.focused().should('not.have.id', 'reply_textbox');
            cy.get('body').type('{upArrow}');
            cy.get(`#rhsPost_${secondRoot.id}`).should('be.visible');
            cy.get(`#rhsPost_${secondReply.id}`).should('be.visible');
            cy.focused().should('not.have.id', 'reply_textbox');
            cy.get('body').type('something');
            cy.focused().should('have.id', 'reply_textbox').
                should('contain.text', 'something');
            cy.get('body').type('{upArrow}');
            cy.get(`#rhsPost_${secondRoot.id}`).should('be.visible');
            cy.get(`#rhsPost_${secondReply.id}`).should('be.visible');
        });
    });
});