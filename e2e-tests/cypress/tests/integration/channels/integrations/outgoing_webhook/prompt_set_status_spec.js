import * as TIMEOUTS from '../../../../fixtures/timeouts';
describe('Prompting set status', () => {
    let user1;
    let user2;
    let testChannelUrl;
    before(() => {
        cy.apiInitSetup().then(({user, team}) => {
            user1 = user;
            testChannelUrl = `/${team.name}/channels/town-square`;
            cy.apiCreateUser().then(({user: otherUser}) => {
                user2 = otherUser;
                cy.apiAddUserToTeam(team.id, user2.id);
            });
            cy.apiLogin(user1);
            cy.visit(testChannelUrl);
        });
    });
    it('MM-T673 Prompting to set status to online', () => {
        cy.uiOpenUserMenu('Offline');
        cy.uiGetSetStatusButton().find('.icon-circle-outline');
        cy.apiLogout();
        cy.apiLogin(user2);
        cy.visit(testChannelUrl);
        openDM(user1.username);
        cy.get('#channelHeaderInfo').within(() => {
            cy.get('.offline--icon').should('be.visible');
            cy.get('.online--icon').should('not.exist');
            cy.findByText('Offline').should('be.visible');
        });
        cy.apiGetUserStatus(user1.id).then((result) => {
            cy.wrap(result.status.status).should('be.equal', 'offline');
        });
        cy.apiLogin(user1);
        cy.visit(testChannelUrl);
        cy.get('.modal-content').within(() => {
            cy.findByText('Your Status is Set to "Offline"').should('be.visible');
            cy.get('#cancelModalButton').click();
        });
        cy.uiGetSetStatusButton().find('.icon-circle-outline');
        cy.apiLogin(user2);
        cy.visit(testChannelUrl);
        openDM(user1.username);
        cy.get('#channelHeaderInfo').within(() => {
            cy.get('.offline--icon').should('be.visible');
            cy.get('.online--icon').should('not.exist');
            cy.findByText('Offline').should('be.visible');
        });
        cy.apiGetUserStatus(user1.id).then((result) => {
            cy.wrap(result.status.status).should('be.equal', 'offline');
        });
    });
});
const openDM = (username) => {
    cy.uiAddDirectMessage().click().wait(TIMEOUTS.TWO_SEC);
    cy.get('#selectItems input').typeWithForce(username).wait(TIMEOUTS.TWO_SEC);
    cy.get('#multiSelectList').findByText(`@${username}`).click();
    cy.get('#selectItems').findByText(username).should('be.visible');
    cy.findByText('Go').click();
};