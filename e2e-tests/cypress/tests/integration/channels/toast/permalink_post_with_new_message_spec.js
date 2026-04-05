import {getRandomId} from '../../../utils';
describe('Toast', () => {
    let testTeam;
    let otherUser;
    let testChannelId;
    let testChannelUrl;
    let postIdToJumpTo;
    const numberOfPosts = 30;
    before(() => {
        cy.apiCreateUser().then(({user}) => {
            otherUser = user;
        });
        cy.apiInitSetup().then(({team, channel, user, channelUrl}) => {
            testTeam = team;
            testChannelId = channel.id;
            testChannelUrl = channelUrl;
            cy.apiAddUserToTeam(testTeam.id, otherUser.id).then(() => {
                cy.apiAddUserToChannel(testChannelId, otherUser.id);
                cy.apiLogin(user);
                cy.visit(testChannelUrl);
            });
        });
    });
    it('MM-T1794 Permalink post view combined with New Message toast', () => {
        Cypress._.times(numberOfPosts, (num) => {
            if (num === 2) {
                cy.getLastPostId().then((postId) => {
                    postIdToJumpTo = postId;
                });
            }
            cy.postMessageAs({sender: otherUser, message: `${num} ${getRandomId()}`, channelId: testChannelId});
        });
        cy.getLastPostId().then((id) => {
            const permalink = `${Cypress.config('baseUrl')}/${testTeam.name}/pl/${id}`;
            cy.get(`#CENTER_button_${id}`).should('not.be.visible');
            cy.clickPostDotMenu(id);
            cy.uiClickCopyLink(permalink, id);
            cy.postMessage(permalink);
            cy.getLastPost().get('.post-message__text a').last().scrollIntoView().click();
            cy.url().should('include', `${testChannelUrl}/${id}`);
            cy.get(`#postMessageText_${postIdToJumpTo}`).scrollIntoView();
            cy.postMessageAs({sender: otherUser, message: 'Random Message', channelId: testChannelId});
            cy.postMessageAs({sender: otherUser, message: 'Last Message', channelId: testChannelId});
            cy.findByText('Last Message').should('not.be.visible');
            cy.get('.toast__visible').should('be.visible').click();
            cy.findByText('Last Message').should('be.visible');
            cy.url().should('include', testChannelUrl).and('not.include', id);
        });
    });
});