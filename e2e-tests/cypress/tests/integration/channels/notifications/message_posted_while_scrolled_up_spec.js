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
    it('MM-T562 New message bar - Message posted while scrolled up in same channel', () => {
        Cypress._.times(numberOfPosts, (num) => {
            cy.postMessageAs({sender: otherUser, message: `${num} ${getRandomId()}`, channelId: offTopicChannelId});
        });
        cy.get('.post-list__dynamic').scrollTo('top');
        cy.postMessageAs({sender: otherUser, message: 'Random Message', channelId: offTopicChannelId});
        cy.postMessageAs({sender: otherUser, message: 'Last Message', channelId: offTopicChannelId});
        cy.findByText('Last Message').should('not.be.visible');
        cy.get('.toast__visible').should('be.visible').click();
        cy.findByText('Last Message').should('be.visible');
        cy.get('.toast__visible').should('not.exist');
    });
});