import * as TIMEOUTS from '../../../fixtures/timeouts';
describe('Profile popover', () => {
    const message = `Testing ${Date.now()}`;
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
                    cy.apiAddUserToChannel(testChannel.id, otherUser.id).then(() => {
                        cy.apiLogin(testUser);
                        cy.visit(`/${testTeam.name}/channels/${testChannel.name}`);
                        cy.postMessageAs({sender: otherUser, message, channelId: testChannel.id}).wait(TIMEOUTS.FIVE_SEC);
                    });
                });
            });
        });
    });
    it('MM-T3310 Send message in profile popover take to DM channel', () => {
        cy.waitUntil(() => cy.getLastPost().then((el) => {
            const postedMessageEl = el.find('.post-message__text > p')[0];
            return Boolean(postedMessageEl && postedMessageEl.textContent.includes(message));
        }));
        cy.getLastPostId().then((lastPostId) => {
            verifyDMChannelViaSendMessage(lastPostId, testTeam, testChannel, '.status-wrapper', otherUser);
            verifyDMChannelViaSendMessage(lastPostId, testTeam, testChannel, '.user-popover', otherUser);
            cy.viewport('iphone-6');
            verifyDMChannelViaSendMessage(lastPostId, testTeam, testChannel, '.status-wrapper', otherUser);
            verifyDMChannelViaSendMessage(lastPostId, testTeam, testChannel, '.user-popover', otherUser);
        });
    });
});
function verifyDMChannelViaSendMessage(postId, team, channel, profileSelector, user) {
    cy.visit(`/${team.name}/channels/${channel.name}`);
    cy.clickPostCommentIcon(postId);
    cy.get('#rhsContainer').should('be.visible');
    cy.wait(TIMEOUTS.HALF_SEC);
    cy.get(`#rhsPost_${postId}`).should('be.visible').within(() => {
        cy.get(profileSelector).should('be.visible').click();
    });
    cy.wait(TIMEOUTS.HALF_SEC);
    cy.get('#user-profile-popover').should('be.visible').within(() => {
        cy.findByText('Message').should('be.visible').click();
    });
    cy.wait(TIMEOUTS.HALF_SEC);
    cy.get('#user-profile-popover').should('not.exist');
    cy.get('#channelIntro').should('be.visible').within(() => {
        cy.url().should('include', `/${team.name}/messages/@${user.username}`);
        cy.get('.channel-intro__title').
            should('be.visible').
            and('have.text', user.username);
        cy.get('.channel-intro__text').
            should('be.visible').
            and('contain', `This is the start of your direct message history with ${user.username}.`).
            and('contain', 'Messages and files shared here are not shown to anyone else.');
    });
}