import * as MESSAGES from '../../../fixtures/messages';
import * as TIMEOUTS from '../../../fixtures/timeouts';
describe('Notifications', () => {
    let testTeam;
    let testChannel;
    let otherUser;
    beforeEach(() => {
        cy.apiInitSetup().then(({team, channel, user}) => {
            testTeam = team;
            testChannel = channel;
            otherUser = user;
            cy.visit(`/${testTeam.name}/channels/${channel.name}`);
        });
    });
    it('MM-T565 New message bar - Doesnt display for emoji reaction', () => {
        cy.postMessage(MESSAGES.SMALL);
        Cypress._.times(30, (postNumber) => {
            cy.postMessageAs({sender: otherUser, message: `P${postNumber}`, channelId: testChannel.id});
        });
        cy.postMessage('This post will have a reaction');
        cy.getNthPostId(1).then((firstPostId) => {
            cy.get(`#post_${firstPostId}`).should('exist').scrollIntoView();
        });
        cy.getLastPostId().then((lastPostID) => {
            cy.reactToMessageAs({sender: otherUser, postId: lastPostID, reaction: 'smile'});
        });
        cy.get('.toast.toast__visible').should('not.exist');
    });
    it('MM-T566 New message bar - Displays in permalink view', () => {
        cy.makeClient().then(async (client) => {
            const townChannel = await client.getChannelByName(testTeam.id, 'town-square');
            const townChannelId = townChannel.id;
            Cypress._.times(15, (postNumber) => {
                cy.postMessageAs({sender: otherUser, message: `P${postNumber}`, channelId: townChannelId});
            });
            cy.uiGetSearchContainer().click();
            cy.uiGetSearchBox().
                typeWithForce('in:town-square').
                wait(TIMEOUTS.HALF_SEC).
                typeWithForce('{enter}').
                typeWithForce('{enter}');
            cy.get('a.search-item__jump').last().click();
            cy.getNthPostId(1).then((postIdTest) => {
                cy.get(`#post_${postIdTest}`, {timeout: TIMEOUTS.HALF_MIN}).should('have.class', 'post--highlight');
                cy.clock();
                cy.tick(6000);
                cy.get(`#post_${postIdTest}`).should('not.have.class', 'post--highlight');
            });
            cy.postMessageAs({
                sender: otherUser,
                message: 'message from user B',
                channelId: townChannelId,
            });
            cy.get('.NotificationSeparator').should('exist');
        });
    });
});