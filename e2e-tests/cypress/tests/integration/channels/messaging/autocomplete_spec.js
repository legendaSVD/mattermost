import * as TIMEOUTS from '../../../fixtures/timeouts';
import {getAdminAccount} from '../../../support/env';
describe('autocomplete', () => {
    let testTeam;
    let testChannel;
    let testUser;
    let otherUser;
    let otherUser2;
    let notInChannelUser;
    let sysadmin;
    let displayNameTestUser;
    let displayNameOtherUser;
    before(() => {
        sysadmin = getAdminAccount();
        cy.apiInitSetup({channelPrefix: {name: 'ask-anything', displayName: 'Ask Anything'}}).then(({team, channel, user}) => {
            testTeam = team;
            testChannel = channel;
            testUser = user;
            displayNameTestUser = `${testUser.first_name} ${testUser.last_name} (${testUser.nickname})`;
            cy.apiCreateUser({prefix: 'other'}).then(({user: user1}) => {
                otherUser = user1;
                cy.apiAddUserToTeam(testTeam.id, otherUser.id).then(() => {
                    cy.apiAddUserToChannel(testChannel.id, otherUser.id);
                });
                displayNameOtherUser = `${otherUser.first_name} ${otherUser.last_name} (${otherUser.nickname})`;
            });
            cy.apiCreateUser({prefix: 'other'}).then(({user: user1}) => {
                otherUser2 = user1;
                cy.apiAddUserToTeam(testTeam.id, otherUser2.id).then(() => {
                    cy.apiAddUserToChannel(testChannel.id, otherUser2.id);
                });
            });
            cy.apiCreateUser({prefix: 'notinchannel'}).then(({user: user1}) => {
                notInChannelUser = user1;
                cy.apiAddUserToTeam(testTeam.id, notInChannelUser.id);
            });
        });
    });
    it('MM-T2199 @ autocomplete - username', () => {
        cy.visit(`/${testTeam.name}/channels/town-square`);
        cy.uiGetPostTextBox().clear().type(`@${testUser.username}`);
        cy.get('#suggestionList').should('be.visible').within(() => {
            cy.findByText(displayNameTestUser).should('be.visible');
            cy.findByText(displayNameOtherUser).should('not.exist');
        });
        cy.uiPostMessageQuickly(`@${testUser.username} `);
        cy.uiWaitUntilMessagePostedIncludes(testUser.username);
        cy.getLastPostId().then((postId) => {
            cy.get(`#postMessageText_${postId}`).should('contain', `${testUser.username}`);
        });
    });
    it('MM-T2200 @ autocomplete - nickname', () => {
        cy.visit(`/${testTeam.name}/channels/town-square`);
        cy.uiGetPostTextBox().clear().type(`@${testUser.nickname}`);
        cy.get('#suggestionList').within(() => {
            cy.findByText(displayNameTestUser).should('be.visible');
            cy.findByText(displayNameOtherUser).should('not.exist');
        });
        cy.uiGetPostTextBox().type('{enter}{enter}');
        cy.uiWaitUntilMessagePostedIncludes(testUser.username);
        cy.getLastPostId().then((postId) => {
            cy.get(`#postMessageText_${postId}`).should('contain', `${testUser.username}`);
        });
    });
    it('MM-T2201 @ autocomplete - first name', () => {
        cy.visit(`/${testTeam.name}/channels/town-square`);
        cy.uiGetPostTextBox().clear().type(`@${testUser.first_name}`);
        cy.get('#suggestionList').within(() => {
            cy.findByText(displayNameTestUser).should('be.visible');
            cy.findByText(displayNameOtherUser).should('not.exist');
        });
        cy.uiGetPostTextBox().type('{enter}{enter}');
        cy.uiWaitUntilMessagePostedIncludes(testUser.username);
        cy.getLastPostId().then((postId) => {
            cy.get(`#postMessageText_${postId}`).should('contain', `${testUser.username}`);
        });
    });
    it('MM-T2203 @ autocomplete - not email', () => {
        cy.visit(`/${testTeam.name}/channels/town-square`);
        cy.uiGetPostTextBox().clear().type(`@${testUser.email}`);
        cy.get('#suggestionList').should('not.exist');
    });
    it('MM-T2206 @ autocomplete - not in channel (center), have permission to add (public channel)', () => {
        const message = `@${notInChannelUser.username} did not get notified by this mention because they are not in the channel. Would you like to add them to the channel? They will have access to all message history.`;
        cy.visit(`/${testTeam.name}/channels/${testChannel.name}`);
        cy.uiGetPostTextBox().clear().type('@');
        cy.get('#suggestionList').should('be.visible');
        cy.uiGetPostTextBox().type(notInChannelUser.username);
        cy.uiGetPostTextBox().type('{enter}{enter}');
        cy.uiWaitUntilMessagePostedIncludes('They will have access to all message history.');
        cy.getLastPostId().then((postId) => {
            cy.get(`#postMessageText_${postId}`).should('include.text', message);
            cy.get('a.PostBody_addChannelMemberLink').should('be.visible').click();
            cy.uiWaitUntilMessagePostedIncludes('added to the channel by you');
            cy.getLastPostId().then((npostId) => {
                cy.get(`#postMessageText_${npostId}`).should('include.text', `@${notInChannelUser.username} added to the channel by you`);
            });
        });
    });
    it('MM-T2207 Added to channel from autocomplete not in channel', () => {
        let tempUser;
        cy.apiCreateUser({prefix: 'temp'}).then(({user: user1}) => {
            tempUser = user1;
            cy.apiAddUserToTeam(testTeam.id, tempUser.id);
            cy.apiLogin(testUser).then(() => {
                cy.visit(`/${testTeam.name}/channels/${testChannel.name}`);
                cy.uiGetPostTextBox().clear().type('@');
                cy.get('#suggestionList').should('be.visible');
                cy.uiGetPostTextBox().type(tempUser.username);
                cy.uiGetPostTextBox().type('{enter}{enter}');
                cy.uiWaitUntilMessagePostedIncludes('They will have access to all message history.');
                cy.getLastPostId().then((postId) => {
                    cy.get(`#postMessageText_${postId}`).should('include.text', `@${tempUser.username} did not get notified by this mention because they are not in the channel. Would you like to add them to the channel? They will have access to all message history.`);
                    cy.get('a.PostBody_addChannelMemberLink').should('be.visible').click();
                    cy.uiWaitUntilMessagePostedIncludes('added to the channel by you');
                });
                cy.get('#sidebarItem_off-topic', {timeout: TIMEOUTS.HALF_MIN}).should('be.visible').click();
                cy.apiLogout().then(() => {
                    cy.apiLogin(tempUser).then(() => {
                        cy.visit(`/${testTeam.name}`);
                        cy.get(`#sidebarItem_${testChannel.name}`).
                            scrollIntoView().
                            find('#unreadMentions').
                            should('be.visible').
                            and('have.text', '1');
                        cy.get(`#sidebarItem_${testChannel.name}`).click();
                        cy.uiWaitUntilMessagePostedIncludes('You were added to the channel');
                        cy.getLastPostId().then((postId) => {
                            cy.get(`#postMessageText_${postId}`).should('include.text', `You were added to the channel by @${testUser.username}`);
                        });
                        cy.apiLogout().then(() => {
                            cy.apiLogin(sysadmin);
                        });
                    });
                });
            });
        });
    });
    it('MM-T2209 @ autocomplete - not in DM, GM', () => {
        const userGroupIds = [testUser.id, otherUser.id, otherUser2.id];
        cy.apiCreateGroupChannel(userGroupIds).then(({channel: gmChannel}) => {
            cy.visit(`/${testTeam.name}/channels/${gmChannel.name}`);
            cy.uiGetPostTextBox().clear().type('@');
            cy.get('#suggestionList').should('be.visible');
            cy.uiGetPostTextBox().type(notInChannelUser.username);
            cy.uiGetPostTextBox().type('{enter}{enter}');
            cy.uiWaitUntilMessagePostedIncludes(notInChannelUser.username);
            cy.getLastPostId().then((postId) => {
                cy.get(`#postMessageText_${postId}`).should('not.include.text', `@${notInChannelUser.username} did not get notified by this mention because they are not in the channel. Would you like to add them to the channel? They will have access to all message history.`);
                cy.get(`#postMessageText_${postId}`).should('contain', `${notInChannelUser.username}`);
                cy.get(`#postMessageText_${postId}`).find('.mention-link').should('exist');
            });
        });
        cy.apiCreateDirectChannel([testUser.id, otherUser.id]).then(() => {
            cy.visit(`/${testTeam.name}/channels/${testUser.id}__${otherUser.id}`);
            cy.uiGetPostTextBox().clear().type('@');
            cy.get('#suggestionList').should('be.visible');
            cy.uiGetPostTextBox().type(notInChannelUser.username);
            cy.uiGetPostTextBox().type('{enter}{enter}');
            cy.uiWaitUntilMessagePostedIncludes(notInChannelUser.username);
            cy.getLastPostId().then((postId) => {
                cy.get(`#postMessageText_${postId}`).should('not.include.text', `@${notInChannelUser.username} did not get notified by this mention because they are not in the channel. Would you like to add them to the channel? They will have access to all message history.`);
                cy.get(`#postMessageText_${postId}`).should('contain', `${notInChannelUser.username}`);
                cy.get(`#postMessageText_${postId}`).find('.mention-link').should('exist');
            });
        });
    });
    it('MM-T2212 @ mention followed by dot or underscore should highlight', () => {
        cy.visit(`/${testTeam.name}/channels/town-square`);
        cy.uiGetPostTextBox().clear().type(`@${sysadmin.username}.`).type('{enter}{enter}');
        cy.uiWaitUntilMessagePostedIncludes(sysadmin.username);
        cy.getLastPostId().then((postId) => {
            cy.get(`#postMessageText_${postId}`).should('contain', `${sysadmin.username}`);
            cy.get(`#postMessageText_${postId}`).
                findByText(`@${sysadmin.username}`).should('have.class', 'mention-link').
                parent().should('have.class', 'mention--highlight');
        });
        cy.uiGetPostTextBox().clear().type(`@${sysadmin.username}_`).type('{enter}{enter}');
        cy.uiWaitUntilMessagePostedIncludes(sysadmin.username);
        cy.getLastPostId().then((postId) => {
            cy.get(`#postMessageText_${postId}`).should('contain', `${sysadmin.username}`);
            cy.get(`#postMessageText_${postId}`).
                findByText(`@${sysadmin.username}`).should('have.class', 'mention-link').
                parent().should('have.class', 'mention--highlight');
        });
    });
});