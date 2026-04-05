import {measurePerformance} from './utils.js';
describe('Team switch performance test', () => {
    let testTeam1;
    let testTeam2;
    before(() => {
        cy.apiInitSetup({loginAfter: true}).then(({team}) => {
            testTeam1 = team;
            cy.apiCreateTeam('team-b', 'Team B').then(({team: team2}) => {
                testTeam2 = team2;
                cy.visit(`/${testTeam1.name}/channels/town-square`);
                cy.get('#teamSidebarWrapper').should('be.visible');
                cy.get(`#${testTeam2.name}TeamButton`).should('be.visible');
            });
        });
    });
    it('measures switching between two teams from LHS', () => {
        measurePerformance(
            'teamLoad',
            1900,
            () => {
                cy.get('#teamSidebarWrapper').within(() => {
                    cy.get(`#${testTeam2.name}TeamButton`).should('be.visible').click();
                });
                return expectActiveTeamToBe(testTeam2.display_name, testTeam2.name);
            },
            () => {
                cy.visit(`/${testTeam1.name}/channels/town-square`);
                cy.get('#teamSidebarWrapper').should('be.visible');
                cy.get(`#${testTeam2.name}TeamButton`).should('be.visible');
            },
        );
    });
});
const expectActiveTeamToBe = (title, url) => {
    cy.get('#sidebar-header-container').
        should('be.visible').
        and('contain.text', title);
    cy.get('#app-content').should('be.visible');
    return cy.url().should('contain', url);
};