import * as TIMEOUTS from '../../../fixtures/timeouts';
describe('Send a DM', () => {
    let userA;
    let userB;
    let userC;
    let testChannel;
    let teamA;
    let teamB;
    let offTopicUrlA;
    let offTopicUrlB;
    before(() => {
        cy.apiInitSetup().then(({team, channel, user, offTopicUrl: url}) => {
            userA = user;
            teamA = team;
            testChannel = channel;
            offTopicUrlA = url;
            cy.apiCreateUser().then(({user: otherUser}) => {
                userB = otherUser;
                return cy.apiAddUserToTeam(teamA.id, userB.id);
            }).then(() => {
                return cy.apiCreateUser();
            }).then(({user: otherUser}) => {
                userC = otherUser;
                return cy.apiAddUserToTeam(teamA.id, userC.id);
            }).then(() => {
                return cy.apiCreateTeam('team', 'Team');
            }).then(({team: otherTeam}) => {
                teamB = otherTeam;
                offTopicUrlB = `/${teamB.name}/channels/off-topic`;
                return cy.apiAddUserToTeam(teamB.id, userA.id);
            }).then(() => {
                return cy.apiAddUserToTeam(teamB.id, userB.id);
            });
        });
    });
    beforeEach(() => {
        cy.apiLogin(userA);
        cy.visit(offTopicUrlA);
    });
    it('MM-T433 Switch teams', () => {
        cy.apiCreateDirectChannel([userA.id, userB.id]).wait(TIMEOUTS.ONE_SEC).then(() => {
            cy.visit(`/${teamA.name}/channels/${userA.id}__${userB.id}`);
            cy.postMessage(':)');
            return cy.apiCreateDirectChannel([userA.id, userC.id]).wait(TIMEOUTS.ONE_SEC);
        }).then(() => {
            cy.visit(`/${teamA.name}/channels/${userA.id}__${userC.id}`);
            cy.postMessage(':(');
        });
        cy.get(`#${teamB.name}TeamButton`, {timeout: TIMEOUTS.ONE_MIN}).should('be.visible').click();
        cy.uiGetLhsSection('CHANNELS').get('.active').should('contain', 'Town Square');
        cy.uiGetLHSHeader().findByText(teamB.display_name);
        cy.uiGetLhsSection('DIRECT MESSAGES').findByText(userB.username).should('be.visible');
        cy.uiGetLhsSection('DIRECT MESSAGES').findByText(userC.username).should('be.visible');
        cy.uiClickSidebarItem('off-topic');
        cy.postMessage('Hello World');
        cy.getLastPostId().then((postId) => {
            cy.get(`#postMessageText_${postId}`).should('be.visible').and('have.text', 'Hello World');
        });
        cy.get(`#${teamA.name}TeamButton`, {timeout: TIMEOUTS.ONE_MIN}).should('be.visible').click();
        cy.get('#sidebarItem_off-topic').should('not.have.class', 'unread-title');
        cy.uiGetLhsSection('DIRECT MESSAGES').findByText(userB.username).should('be.visible');
        cy.uiGetLhsSection('DIRECT MESSAGES').findByText(userC.username).should('be.visible');
        cy.url().should('include', `/${teamA.name}/messages/@${userC.username}`);
    });
    it('MM-T437 Multi-team mentions', () => {
        cy.apiLogin(userB);
        cy.visit(offTopicUrlB);
        cy.postMessage(`@${userA.username} `);
        cy.postMessage(`@${userA.username} `);
        cy.apiLogout();
        cy.apiLogin(userA);
        cy.visit(offTopicUrlA);
        cy.get(`#${teamB.name}TeamButton`).should('be.visible').within(() => {
            cy.get('.badge').contains('2');
        });
    });
    it('MM-T438 Multi-team unreads', () => {
        cy.visit(offTopicUrlB);
        cy.visit(`/${teamA.name}/channels/${testChannel.name}`);
        cy.get(`#${teamB.name}TeamButton`).should('be.visible').within(() => {
            cy.get('.badge').should('not.exist');
        });
        cy.apiLogin(userB);
        cy.visit(offTopicUrlA);
        cy.postMessage('Hey all');
        cy.apiLogout();
        cy.apiLogin(userA);
        cy.visit(offTopicUrlB);
        cy.get(`#${teamA.name}TeamButton`).children('.unread').should('be.visible');
        cy.get(`#${teamA.name}TeamButton`).should('be.visible').within(() => {
            cy.get('.badge').should('not.exist');
        });
    });
});