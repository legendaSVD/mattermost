import * as TIMEOUTS from '../../../fixtures/timeouts';
import * as MESSAGES from '../../../fixtures/messages';
describe('Send a DM', () => {
    let userA;
    let userB;
    let team1;
    let testChannelUrl;
    before(() => {
        cy.apiInitSetup().then(({team, user}) => {
            userA = user;
            team1 = team;
            testChannelUrl = `/${team.name}/channels/town-square`;
            cy.apiCreateUser().then(({user: otherUser}) => {
                userB = otherUser;
                cy.apiAddUserToTeam(team.id, userB.id);
            });
        });
    });
    it('MM-T451 Send a DM to someone on no team', () => {
        cy.apiLogin(userA);
        cy.visit(testChannelUrl);
        cy.get('#postListContent', {timeout: TIMEOUTS.HALF_MIN}).should('be.visible');
        cy.uiGetLHSHeader().click();
        cy.findByText('Leave team').click();
        cy.findByText('Yes').click();
        cy.url().should('include', '/select_team');
        cy.apiLogout();
        cy.apiLogin(userB);
        cy.visit(testChannelUrl);
        cy.uiAddDirectMessage().click();
        cy.get('#selectItems input').typeWithForce(userA.username).wait(TIMEOUTS.HALF_SEC);
        cy.get('#multiSelectList').findByText(`@${userA.username}`).click();
        cy.findByText('Go').click();
        cy.postMessage(MESSAGES.SMALL);
        cy.uiWaitUntilMessagePostedIncludes(MESSAGES.SMALL);
        cy.uiGetLhsSection('DIRECT MESSAGES').findByText(userA.username).should('be.visible');
        cy.apiAddUserToTeam(team1.id, userA.id);
        cy.apiLogout();
        cy.apiLogin(userA);
        cy.visit(testChannelUrl);
        cy.get('#postListContent', {timeout: TIMEOUTS.TWO_MIN}).should('be.visible');
        cy.uiGetLhsSection('DIRECT MESSAGES').findByText(userB.username).should('be.visible');
    });
});