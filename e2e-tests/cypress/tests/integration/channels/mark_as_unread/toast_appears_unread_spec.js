import * as TIMEOUTS from '../../../fixtures/timeouts';
import {markAsUnreadFromPost, switchToChannel} from './helpers';
describe('Verify unread toast appears after repeated manual marking post as unread', () => {
    let firstPost;
    let secondPost;
    const offTopicChannel = {name: 'off-topic', display_name: 'Off-Topic'};
    let testChannel;
    before(() => {
        cy.apiInitSetup().then(({team, user, channel}) => {
            testChannel = channel;
            cy.apiCreateUser({prefix: 'other'}).then(({user: otherUser}) => {
                cy.apiAddUserToTeam(team.id, otherUser.id).then(() => {
                    cy.apiAddUserToChannel(testChannel.id, otherUser.id);
                    cy.apiLogin(user);
                    cy.visit(`/${team.name}/channels/${testChannel.name}`);
                    switchToChannel(offTopicChannel);
                    cy.get('#channelHeaderTitle').should('be.visible').and('contain.text', offTopicChannel.display_name);
                    cy.wait(TIMEOUTS.ONE_SEC).postMessageAs({
                        sender: otherUser,
                        message: 'First message',
                        channelId: testChannel.id,
                    }).then((post) => {
                        firstPost = post;
                        cy.postMessageAs({
                            sender: otherUser,
                            message: 'Second message',
                            channelId: testChannel.id,
                        }).then((post2) => {
                            secondPost = post2;
                            Cypress._.times(30, (index) => {
                                cy.postMessageAs({
                                    sender: otherUser,
                                    message: `${index.toString()}\nsecond line\nthird line\nfourth line`,
                                    channelId: testChannel.id,
                                });
                            });
                        });
                    });
                });
            });
        });
    });
    it('MM-T1429 Toast when navigating to channel with unread messages and after repeated marking as unread', () => {
        switchToChannel(testChannel);
        cy.get('div.toast').should('be.visible');
        cy.get('.post-list__dynamic').scrollTo('bottom');
        cy.get('div.toast').should('not.exist');
        markAsUnreadFromPost(firstPost);
        cy.get('div.toast').should('be.visible');
        cy.get('.post-list__dynamic').scrollTo('bottom');
        cy.get('div.toast').should('not.exist');
        markAsUnreadFromPost(secondPost);
        cy.get('div.toast').should('be.visible');
        switchToChannel(offTopicChannel);
        cy.get('div.toast').should('not.exist');
        switchToChannel(testChannel);
        cy.get('div.toast').should('be.visible');
    });
});