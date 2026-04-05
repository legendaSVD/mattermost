import {DEFAULT_TEAM} from '../../../support/constants';
const NUMBER_OF_TEAMS = 3;
describe('Multi-Team + DMs', () => {
    before(() => {
        cy.apiCreateUser().its('user').as('user');
        cy.apiGetAllTeams().then(({teams}) => {
            teams.forEach((team) => {
                if (team.name !== DEFAULT_TEAM.name) {
                    cy.apiDeleteTeam(team.id, true);
                }
            });
        });
        for (let i = 0; i < NUMBER_OF_TEAMS; i++) {
            cy.apiCreateTeam('team', 'Team', 'O', true, {allow_open_invite: true});
        }
    });
    it('MM-T1805 No infinite loading spinner on Select Team page', function() {
        cy.apiLogin(this.user);
        joinAllTeams();
        cy.get('.loading-screen').should('not.exist');
    });
});
function joinAllTeams() {
    cy.visit('/select_team');
    cy.findByText('All team communication in one place, searchable and accessible anywhere');
    cy.findAllByText(/Team\s/).then(([firstTeam, nextTeam]) => {
        firstTeam.click();
        if (nextTeam) {
            joinAllTeams();
        }
    });
}