import {getRandomId} from '../../../utils';
import * as TIMEOUTS from '../../../fixtures/timeouts';
describe('Reply in existing GM', () => {
    let testUser;
    let otherUser1;
    let otherUser2;
    let testTeam;
    before(() => {
        cy.apiInitSetup().then(({team, user}) => {
            testTeam = team;
            testUser = user;
            cy.apiCreateUser({prefix: 'otherA'}).then(({user: newUser}) => {
                otherUser1 = newUser;
                cy.apiAddUserToTeam(team.id, newUser.id);
            });
            cy.apiCreateUser({prefix: 'otherB'}).then(({user: newUser}) => {
                otherUser2 = newUser;
                cy.apiAddUserToTeam(team.id, newUser.id);
            });
            cy.apiLogin(testUser);
            cy.visit(`/${team.name}/channels/town-square`);
        });
    });
    it('MM-T470 Reply in existing GM', () => {
        const userGroupIds = [testUser.id, otherUser1.id, otherUser2.id];
        cy.apiCreateGroupChannel(userGroupIds).then(({channel: gmChannel}) => {
            cy.visit(`/${testTeam.name}/channels/${gmChannel.name}`);
            const rootPostMessage = `this is test message from user: ${otherUser1.id}`;
            cy.postMessageAs({sender: otherUser1, message: rootPostMessage, channelId: gmChannel.id}).then((post) => {
                cy.uiWaitUntilMessagePostedIncludes(rootPostMessage);
                const rootPostId = post.id;
                const rootPostMessageId = `#rhsPostMessageText_${rootPostId}`;
                cy.clickPostCommentIcon(rootPostId);
                cy.get('#rhsContainer').should('be.visible');
                cy.get('#rhsContainer').find(rootPostMessageId).should('have.text', `${rootPostMessage}`);
                const replyMessage = `A reply ${getRandomId()}`;
                cy.postMessageReplyInRHS(replyMessage);
                cy.getLastPostId().then((replyId) => {
                    cy.wait(TIMEOUTS.TWO_SEC);
                    cy.get(`#rhsPostMessageText_${replyId}`).should('be.visible').and('have.text', replyMessage);
                    cy.get(`#postMessageText_${replyId}`).should('be.visible').should('have.text', replyMessage);
                    cy.apiLogin(otherUser1);
                    cy.visit(`/${testTeam.name}/channels/${gmChannel.name}`);
                    cy.get(`#postMessageText_${replyId}`).should('be.visible').should('have.text', replyMessage);
                });
            });
        });
    });
});