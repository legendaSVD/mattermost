import * as TIMEOUTS from '../../../fixtures/timeouts';
describe('Notifications', () => {
    let testUser;
    let otherUser;
    let testTeam;
    beforeEach(() => {
        cy.apiAdminLogin().apiInitSetup().then(({team, user}) => {
            testUser = user;
            testTeam = team;
            cy.apiCreateUser().then(({user: user1}) => {
                otherUser = user1;
                cy.apiAddUserToTeam(testTeam.id, otherUser.id);
            });
            cy.apiLogin(testUser).then(() => {
                cy.apiCreateChannel(testTeam.id, 'channel-test', 'Channel').then(({channel}) => {
                    cy.apiAddUserToChannel(channel.id, otherUser.id);
                    Cypress._.times(40, (i) => {
                        cy.apiCreateChannel(testTeam.id, `channel-test-${i}`, `channel-${i}`).then((out) => {
                            cy.apiAddUserToChannel(out.channel.id, otherUser.id);
                        });
                    });
                    Cypress._.times(40, (i) => {
                        cy.postMessageAs({sender: testUser, message: `test${i}`, channelId: channel.id});
                    });
                    cy.visit(`/${team.name}/channels/${channel.name}`);
                    cy.get('#sidebar-left li').last().scrollIntoView();
                });
            });
        });
    });
    it('MM-T563 New message bar - Reply posted while scrolled up in same channel', () => {
        cy.apiLogin(otherUser);
        cy.getLastPostId().then((postId) => {
            cy.clickPostCommentIcon(postId);
            cy.get('div.post-list__dynamic', {timeout: TIMEOUTS.ONE_MIN}).should('be.visible').
                scrollTo(0, '70%', {duration: TIMEOUTS.ONE_SEC}).
                wait(TIMEOUTS.ONE_SEC);
            const replyMessage = 'A reply to an older post';
            cy.postMessageReplyInRHS(replyMessage);
        });
        cy.apiLogin(testUser);
        cy.get('div.toast').should('be.visible').contains('1 new message');
    });
});