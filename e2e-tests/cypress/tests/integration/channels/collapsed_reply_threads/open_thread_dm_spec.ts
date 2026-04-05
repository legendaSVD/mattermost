import {Team} from '@mattermost/types/teams';
import {UserProfile} from '@mattermost/types/users';
describe('Collapsed Reply Threads', () => {
    let testTeam: Team;
    let testUser: UserProfile;
    let otherUser: UserProfile;
    before(() => {
        cy.apiUpdateConfig({
            ServiceSettings: {
                ThreadAutoFollow: true,
                CollapsedThreads: 'default_off',
                EnableTutorial: false,
            },
        });
        cy.apiInitSetup({loginAfter: true, promoteNewUserAsAdmin: true}).then(({team, user}) => {
            testTeam = team;
            testUser = user;
            cy.apiSaveCRTPreference(testUser.id, 'on');
            cy.apiCreateUser({prefix: 'other'}).then(({user: user1}) => {
                otherUser = user1;
                cy.apiAddUserToTeam(testTeam.id, otherUser.id);
            });
        });
    });
    beforeEach(() => {
        cy.visit(`/${testTeam.name}/messages/@${otherUser.username}`);
    });
    it('should open thread when thread footer reply button is clicked in a DM/GM channel', () => {
        const msg = 'Root post';
        cy.postMessage(msg);
        cy.getLastPostId().then((rootId) => {
            cy.clickPostCommentIcon(rootId);
            cy.uiGetReplyTextBox().type('reply{enter}');
            cy.uiGetReplyTextBox().type('reply2{enter}');
            cy.uiCloseRHS();
            cy.get('#rhsContainer').should('not.exist');
            cy.uiGetPostThreadFooter(rootId).find('button.ReplyButton').click();
            cy.get(`#rhsPost_${rootId}`).within(() => {
                cy.get(`#rhsPostMessageText_${rootId}`).should('be.visible').and('have.text', msg);
            });
        });
    });
});