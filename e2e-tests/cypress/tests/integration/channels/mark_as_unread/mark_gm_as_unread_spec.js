import * as TIMEOUTS from '../../../fixtures/timeouts';
import {verifyPostNextToNewMessageSeparator} from './helpers';
describe('Mark as Unread', () => {
    let testUser;
    let otherUser1;
    let otherUser2;
    before(() => {
        cy.apiInitSetup().then(({team, user}) => {
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
    it('MM-T249 Mark GM post as unread', () => {
        const userGroupIds = [testUser.id, otherUser1.id, otherUser2.id];
        cy.apiCreateGroupChannel(userGroupIds).then(({channel: gmChannel}) => {
            for (let index = 0; index < 8; index++) {
                cy.postMessageAs({sender: otherUser1, message: `this is from user: ${otherUser1.id}, ${index}`, channelId: gmChannel.id});
                cy.postMessageAs({sender: otherUser2, message: `this is from user: ${otherUser2.id}, ${index}`, channelId: gmChannel.id});
            }
            cy.get(`#sidebarItem_${gmChannel.name}`).click();
            cy.reload();
            cy.getNthPostId(-2).then((postId) => {
                cy.uiClickPostDropdownMenu(postId, 'Mark as Unread');
            });
            verifyPostNextToNewMessageSeparator(`this is from user: ${otherUser1.id}, 7`);
            cy.get(`#sidebarItem_${gmChannel.name}`).should('have.attr', 'aria-label', `${otherUser1.username}, ${otherUser2.username} 2 mentions`);
            cy.get('#sidebarItem_town-square').click();
            cy.get(`#sidebarItem_${gmChannel.name}`).should('have.attr', 'aria-label', `${otherUser1.username}, ${otherUser2.username} 2 mentions`);
            cy.get(`#sidebarItem_${gmChannel.name}`).click().wait(TIMEOUTS.ONE_SEC);
            cy.get(`#sidebarItem_${gmChannel.name}`).should('exist').should('not.have.attr', 'aria-label', `${otherUser1.username}, ${otherUser2.username} 2 mentions`);
            verifyPostNextToNewMessageSeparator(`this is from user: ${otherUser1.id}, 7`);
        });
    });
});