import * as TIMEOUTS from '../../../fixtures/timeouts';
describe('Message permalink', () => {
    let testTeam;
    let testChannel;
    let testUser;
    let otherUser;
    before(() => {
        cy.apiInitSetup().then(({team, channel, user}) => {
            testTeam = team;
            testChannel = channel;
            testUser = user;
            cy.apiCreateUser().then(({user: user1}) => {
                otherUser = user1;
                cy.apiAddUserToTeam(testTeam.id, otherUser.id).then(() => {
                    cy.apiLogin(testUser);
                    cy.apiCreateDirectChannel([testUser.id, otherUser.id]);
                });
            });
        });
    });
    beforeEach(() => {
        cy.visit(`/${testTeam.name}/messages/@${otherUser.username}`);
    });
    it('MM-T177 Copy a permalink and paste into another channel', () => {
        const message = 'Hello' + Date.now();
        cy.postMessage(message);
        cy.getLastPostId().then((postId) => {
            const permalink = `${Cypress.config('baseUrl')}/${testTeam.name}/pl/${postId}`;
            cy.get(`#CENTER_button_${postId}`).should('not.be.visible');
            cy.clickPostDotMenu(postId);
            cy.uiClickCopyLink(permalink, postId);
            const dmChannelLink = `/${testTeam.name}/messages/@${otherUser.username}`;
            cy.apiSaveMessageDisplayPreference('compact');
            verifyPermalink(message, testChannel, permalink, postId, dmChannelLink);
            cy.apiSaveMessageDisplayPreference('clean');
            verifyPermalink(message, testChannel, permalink, postId, dmChannelLink);
        });
    });
    it('Permalink highlight should fade after timeout and change to channel url', () => {
        const message = 'Hello' + Date.now();
        cy.postMessage(message);
        cy.getLastPostId().then((postId) => {
            const link = `/${testTeam.name}/messages/@${otherUser.username}/${postId}`;
            cy.visit(link);
            cy.url().should('include', link);
            cy.get(`#post_${postId}`, {timeout: TIMEOUTS.HALF_MIN}).should('have.class', 'post--highlight');
            cy.clock();
            cy.tick(6000);
            cy.get(`#post_${postId}`).should('not.have.class', 'post--highlight');
            cy.url().should('not.include', postId);
        });
    });
});
function verifyPermalink(message, testChannel, permalink, postId, dmChannelLink) {
    cy.get('#sidebarItem_' + testChannel.name).click({force: true});
    cy.wait(TIMEOUTS.HALF_SEC);
    cy.postMessage(permalink);
    cy.getLastPostId().then((id) => {
        cy.get(`#postMessageText_${id} > p > .markdown__link`).scrollIntoView().click();
        cy.url().should('include', `${dmChannelLink}/${postId}`);
        cy.wait(TIMEOUTS.FIVE_SEC).url().should('include', dmChannelLink).and('not.include', `/${postId}`);
    });
    cy.getLastPostId().then((clickedpostid) => {
        cy.get(`#postMessageText_${clickedpostid}`).should('be.visible').and('have.text', message);
    });
}