import {getRandomId} from '../../../utils';
describe('Notifications', () => {
    let otherUser;
    let offTopicChannelId;
    const numberOfPosts = 30;
    before(() => {
        cy.apiInitSetup().then(({team, user, offTopicUrl}) => {
            otherUser = user;
            cy.apiGetChannelByName(team.name, 'off-topic').then(({channel}) => {
                offTopicChannelId = channel.id;
            });
            cy.visit(offTopicUrl);
        });
    });
    it('MM-T564 New message bar - Own user posts a reply while scrolled up in a channel', () => {
        Cypress._.times(numberOfPosts, (num) => {
            cy.postMessageAs({sender: otherUser, message: `${num} ${getRandomId()}`, channelId: offTopicChannelId});
        });
        cy.clickPostCommentIcon();
        cy.get('.post-list__dynamic').scrollTo('top');
        const message = 'This is a test message';
        cy.postMessageReplyInRHS(message);
        cy.get('.toast__visible').should('not.exist');
        cy.uiWaitUntilMessagePostedIncludes(message);
    });
});