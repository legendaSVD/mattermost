import * as TIMEOUTS from '../../../fixtures/timeouts';
describe('Notifications', () => {
    let testUser;
    let testTeam;
    let otherTeam;
    let testTeamTownSquareUrl;
    let siteName;
    before(() => {
        cy.apiGetConfig().then(({config}) => {
            siteName = config.TeamSettings.SiteName;
        });
        cy.apiCreateTeam('team-b', 'Team B').then(({team}) => {
            otherTeam = team;
        });
        cy.apiInitSetup().then(({team, user, townSquareUrl}) => {
            testTeam = team;
            testUser = user;
            testTeamTownSquareUrl = townSquareUrl;
            cy.apiAddUserToTeam(otherTeam.id, testUser.id);
            cy.apiCreateUser().then(({user: otherUser}) => {
                cy.apiAddUserToTeam(team.id, otherUser.id);
            });
            cy.apiLogin(testUser);
            cy.visit(testTeamTownSquareUrl);
            cy.postMessage('hello');
            cy.get('#sidebar-left').get('.unread-title').click();
            cy.wait(TIMEOUTS.ONE_SEC);
            cy.get('.badge').should('not.exist');
            cy.apiLogout();
        });
    });
    it('MM-T556 Browser tab and team sidebar notification - no unreads/mentions', () => {
        cy.apiLogin(testUser);
        cy.visit(testTeamTownSquareUrl);
        cy.title().should('include', `Town Square - ${testTeam.display_name} ${siteName}`);
        cy.get(`#${testTeam.name}TeamButton`).parent('.unread').should('not.exist');
        cy.get('.badge').should('not.exist');
        cy.get(`#${otherTeam.name}TeamButton`).parent('.unread').should('not.exist');
        cy.get('.badge').should('not.exist');
    });
});