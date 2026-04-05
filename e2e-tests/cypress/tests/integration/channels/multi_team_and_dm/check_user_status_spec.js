import * as TIMEOUTS from '../../../fixtures/timeouts';
import * as MESSAGES from '../../../fixtures/messages';
describe('Multi-Team + DMs', () => {
    let userA;
    let userB;
    let testChannelUrl;
    const away = {name: 'away', ariaLabel: 'Away', message: 'You are now away', className: 'icon-clock'};
    const online = {name: 'online', ariaLabel: 'Online', message: 'You are now online', className: 'icon-check', profileClassName: 'icon-check-circle'};
    before(() => {
        cy.apiInitSetup().then(({team, user}) => {
            userA = user;
            testChannelUrl = `/${team.name}/channels/town-square`;
            cy.apiCreateUser().then(({user: otherUser}) => {
                userB = otherUser;
                cy.apiAddUserToTeam(team.id, userB.id);
            });
        });
    });
    it('MM-T423 Online Status - Statuses update in center, in member icon drop-down, and in DM LHS sidebar', () => {
        cy.apiLogin(userB);
        cy.visit(testChannelUrl);
        cy.postMessage(MESSAGES.SMALL);
        cy.uiAddDirectMessage().click();
        cy.get('#selectItems').typeWithForce(userA.username);
        cy.findByText('Loading').should('be.visible');
        cy.findByText('Loading').should('not.exist');
        cy.get('#multiSelectList').findByText(`@${userA.username}`).click();
        cy.findByText('Go').click();
        cy.postMessage(MESSAGES.SMALL);
        setStatus(online.name, online.profileClassName);
        verifyUserStatus(away);
        cy.apiLogout();
        cy.apiLogin(userA);
        cy.visit(testChannelUrl);
        cy.get(`[aria-label^="${userB.username}"]`).
            children().
            find('i').should('have.class', 'status-away');
        cy.get('#member_rhs').click();
        cy.get('#rhsContainer').should('be.visible');
        cy.get(`[data-testid="memberline-${userB.id}"]`).
            should('be.visible').
            children('div.Avatar-IGMzc').
            children().
            find('svg').should('have.attr', 'aria-label', 'Away');
    });
});
function setStatus(status, icon) {
    cy.apiUpdateUserStatus(status);
    cy.uiGetProfileHeader().
        find('i').
        and('have.class', icon);
}
function verifyUserStatus(testCase) {
    cy.uiGetPostTextBox().clear().type('/');
    cy.get('#suggestionList').should('be.visible');
    cy.uiGetPostTextBox().type(`${testCase.name}{enter}`).wait(TIMEOUTS.ONE_HUNDRED_MILLIS).type('{enter}');
    cy.getLastPost().within(() => {
        cy.findByText(testCase.message);
        cy.findByText('(Only visible to you)');
    });
    cy.uiGetProfileHeader().
        find('i').
        and('have.class', testCase.profileClassName || testCase.className);
    cy.postMessage(testCase.name);
    cy.get('.post__img').last().findByLabelText(testCase.ariaLabel);
}