import * as TIMEOUTS from '../../../fixtures/timeouts';
describe('Remove Last Post', () => {
    let testTeam;
    let testUser;
    let otherUser;
    before(() => {
        cy.apiInitSetup().then(({team, channel, user}) => {
            testTeam = team;
            testUser = user;
            cy.apiCreateUser().then(({user: user1}) => {
                otherUser = user1;
                cy.apiAddUserToTeam(testTeam.id, otherUser.id).then(() => {
                    cy.apiAddUserToChannel(channel.id, otherUser.id);
                    cy.apiLogin(testUser);
                    cy.visit(`/${testTeam.name}/messages/@${otherUser.username}`);
                });
            });
        });
    });
    it('MM-T218 Remove last post in channel', () => {
        cy.wait(TIMEOUTS.FIVE_SEC);
        cy.postMessage('Test');
        cy.getLastPostId().then((postId) => {
            cy.clickPostDotMenu(postId);
            cy.get(`#delete_post_${postId}`).click();
            cy.get('#deletePostModalButton').click();
            const baseUrl = Cypress.config('baseUrl');
            cy.url().should('eq', `${baseUrl}/${testTeam.name}/messages/@${otherUser.username}`);
        });
    });
});