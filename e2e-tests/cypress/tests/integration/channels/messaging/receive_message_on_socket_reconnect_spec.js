import * as TIMEOUTS from '../../../fixtures/timeouts';
describe('Messaging', () => {
    let testTeam;
    let testChannel;
    let testUser;
    let userOne;
    before(() => {
        cy.mockWebsockets();
        cy.apiUpdateConfig({ServiceSettings: {EnableReliableWebSockets: true}});
        cy.apiInitSetup().then(({team, channel, user}) => {
            testUser = user;
            testTeam = team;
            testChannel = channel;
            cy.apiCreateUser().then(({user: user1}) => {
                userOne = user1;
                cy.apiAddUserToTeam(testTeam.id, userOne.id).then(() => {
                    cy.apiAddUserToChannel(testChannel.id, userOne.id);
                });
            });
            cy.apiLogin(testUser);
            cy.visit(`/${testTeam.name}/channels/${testChannel.name}`);
            Cypress._.times(5, (i) => {
                cy.postMessage(i);
            });
        });
    });
    it('MM-T94 RHS fetches messages on socket reconnect when a different channel is in center', () => {
        window.mockWebsockets.forEach((value) => {
            value.connect();
        });
        cy.postMessageAs({sender: userOne, message: 'abc', channelId: testChannel.id}).wait(TIMEOUTS.FIVE_SEC);
        cy.getLastPostId().then((rootPostId) => {
            cy.clickPostCommentIcon(rootPostId);
            cy.postMessageReplyInRHS('def');
            cy.uiGetLhsSection('CHANNELS').findByText('Town Square').click().then(() => {
                window.mockWebsockets.forEach((value) => {
                    if (value.close) {
                        value.close();
                    }
                });
                cy.postMessageAs({sender: userOne, message: 'ghi', channelId: testChannel.id, rootId: rootPostId});
                cy.wait(TIMEOUTS.FIVE_SEC);
                cy.get('#rhsContainer .post-right-comments-container').should('be.visible').children().should('have.length', 1);
                cy.get('#rhsContainer .post-right-comments-container').within(() => {
                    cy.findByText('def').should('be.visible');
                    cy.findByText('ghi').should('not.exist');
                }).then(() => {
                    window.mockWebsockets.forEach((value) => {
                        value.connect();
                    });
                    cy.wait(TIMEOUTS.THREE_SEC);
                    cy.uiGetLhsSection('CHANNELS').findByText('Off-Topic').click();
                    cy.postMessage('any');
                    cy.uiGetLhsSection('CHANNELS').findByText('Town Square').click();
                    cy.postMessage('any');
                    cy.wait(TIMEOUTS.THREE_SEC);
                    cy.get('#rhsContainer .post-right-comments-container').should('be.visible').children().should('have.length', 2);
                    cy.get('#rhsContainer .post-right-comments-container').within(() => {
                        cy.findByText('def').should('be.visible');
                        cy.findByText('ghi').should('be.visible');
                    });
                });
            });
        });
    });
});