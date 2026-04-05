import * as TIMEOUTS from '../../../fixtures/timeouts';
describe('Teams Settings', () => {
    let sysadmin: Cypress.UserProfile;
    before(() => {
        cy.apiCreateCustomAdmin({loginAfter: true}).then(({sysadmin: admin}) => {
            sysadmin = admin;
        });
    });
    it('MM-T5299 User tries to go to archived team', () => {
        cy.apiCreateUser().then(({user}) => {
            cy.apiCreateTeam('team1', 'team1').then(({team: team1}) => {
                cy.apiCreateTeam('team2', 'team2').then(({team: team2}) => {
                    cy.apiAddUserToTeam(team1.id, user.id);
                    cy.apiAddUserToTeam(team2.id, user.id);
                    cy.apiLogin(user);
                    cy.visit(`/${team1.name}/channels/town-square`);
                    cy.get(`#${team1.name}TeamButton`, {timeout: TIMEOUTS.TEN_SEC}).should('be.visible');
                    cy.get(`#${team2.name}TeamButton`, {timeout: TIMEOUTS.TEN_SEC}).should('be.visible');
                    cy.apiLogout();
                    cy.clearLocalStorage();
                    cy.reload();
                    cy.apiLogin(sysadmin);
                    cy.apiDeleteTeam(team1.id);
                    cy.apiLogout();
                    cy.apiLogin(user);
                    cy.visit('/');
                    cy.url().should('include', `/${team2.name}/channels/town-square`);
                    cy.visit(`/${team1.name}/channels/town-square`);
                    cy.url().should('include', '/error?type=team_not_found');
                });
            });
        });
    });
});