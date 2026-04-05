import * as TIMEOUTS from '../../../fixtures/timeouts';
describe('Messaging', () => {
    let testTeam;
    let testChannel;
    let testUser;
    let otherUser;
    beforeEach(() => {
        cy.apiInitSetup().then(({team, channel, user}) => {
            testTeam = team;
            testChannel = channel;
            testUser = user;
            cy.apiCreateUser().then(({user: user1}) => {
                otherUser = user1;
                cy.apiAddUserToTeam(testTeam.id, otherUser.id).then(() => {
                    cy.apiLogin(testUser);
                    cy.visit(`/${testTeam.name}/channels/town-square`);
                });
            });
        });
    });
    it('MM-T179 Channel is removed from Unreads section if user navigates out of it via permalink', () => {
        const message = 'Hello' + Date.now();
        let permalink;
        let postId;
        cy.apiCreateDirectChannel([testUser.id, otherUser.id]).then(() => {
            cy.visit(`/${testTeam.name}/messages/@${otherUser.username}`);
            cy.postMessage(message);
            cy.getLastPostId().then((id) => {
                postId = id;
                permalink = `${Cypress.config('baseUrl')}/${testTeam.name}/pl/${postId}`;
                cy.get(`#CENTER_button_${postId}`).should('not.be.visible');
                cy.clickPostDotMenu(postId);
                cy.uiClickCopyLink(permalink, postId);
                postMessageOnChannel(testChannel, otherUser, permalink);
                cy.apiLogout();
                cy.reload();
                cy.apiLogin(otherUser);
                cy.apiSaveSidebarSettingPreference();
                cy.visit(`/${testTeam.name}/channels/town-square`);
                cy.uiGetLhsSection('UNREADS').find('#sidebarItem_' + testChannel.name).
                    should('be.visible').
                    and('have.attr', 'aria-label', `${testChannel.display_name.toLowerCase()} public channel 1 mention`);
                clickLink(testChannel);
                cy.url().should('include', `/${testTeam.name}/messages/@${testUser.username}/${postId}`);
                cy.wait(TIMEOUTS.FIVE_SEC).url().should('include', `/${testTeam.name}/messages/@${testUser.username}`).and('not.include', `/${postId}`);
                cy.findAllByRole('button', {name: 'CHANNELS'}).first().parent().next().should('be.visible').within(() => {
                    cy.get('#sidebarItem_' + testChannel.name).
                        should('be.visible').
                        and('have.attr', 'aria-label', `${testChannel.display_name.toLowerCase()} public channel`);
                });
                cy.uiGetLhsSection('UNREADS').findByText(testChannel.name).should('not.exist');
                cy.uiGetLhsSection('CHANNELS').find('#sidebarItem_' + testChannel.name).invoke('attr', 'aria-label').should('not.include', 'unread');
            });
        });
    });
});
function postMessageOnChannel(channel, user, linkText) {
    cy.get('#sidebarItem_' + channel.name).click({force: true});
    cy.wait(TIMEOUTS.HALF_SEC);
    cy.postMessage(`@${user.username} ${linkText}`);
    cy.findByText('add them to the channel').should('be.visible').click();
}
function clickLink(channel) {
    cy.get('#sidebarItem_' + channel.name).click({force: true});
    cy.wait(TIMEOUTS.HALF_SEC);
    cy.getNthPostId(1).then((postId) => {
        cy.get(`#postMessageText_${postId} > p > .markdown__link`).scrollIntoView().click();
    });
}