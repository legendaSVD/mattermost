import * as TIMEOUTS from '../../../../fixtures/timeouts';
describe('System Console > Team Statistics', () => {
    before(() => {
        cy.apiCreateTeam('mmt906-team', 'mmt906-team').then(({team}) => {
            cy.apiCreateChannel(team.id, 'mmt906-ch', 'mmt906-ch', 'P');
            cy.dbRefreshPostStats().then(() => {
                cy.visit('/admin_console/reporting/team_statistics');
                cy.get('select.team-statistics__team-filter__dropdown').select(team.id);
                cy.wait(TIMEOUTS.TWO_SEC);
            });
        });
    });
    it('MM-T906 Team Statistics displays expected content categories', () => {
        cy.get('.team-statistics__header span').should('be.visible').should('contain', 'Team Statistics for');
        cy.get('.grid-statistics__card').should('have.length', 4);
        cy.get('.admin-console__content').eq(0).find('.title').eq(0).should('contain', 'Total Activated Users');
        cy.get('.admin-console__content').eq(0).find('.title').eq(1).should('contain', 'Public Channels');
        cy.get('.admin-console__content').eq(0).find('.title').eq(2).should('contain', 'Private Channels');
        cy.get('.admin-console__content').eq(0).find('.title').eq(3).should('contain', 'Total Posts');
        cy.get('.total-count.by-day').eq(0).find('.title').should('contain', 'Total Posts');
        cy.get('.total-count.by-day').eq(1).find('.title').should('contain', 'Active Users With Posts');
        cy.get('.total-count.recent-active-users').eq(0).find('.title').should('contain', 'Recent Active Users');
        cy.get('.total-count.recent-active-users').eq(1).find('.title').should('contain', 'Newly Created Users');
        cy.get('.grid-statistics__card').each((el) => {
            cy.wrap(el).find('.content').invoke('text').then(parseFloat).should('be.gt', 0);
        });
        cy.get('.recent-active-users').find('table').eq(0).should('not.empty');
        cy.get('.recent-active-users').find('table').eq(1).should('not.empty');
    });
    it('MM-T907 - Reporting ➜ Team Statistics - teams listed in alphabetical order', () => {
        cy.visit('/admin_console');
        cy.get('#reporting\\/team_statistics').click();
        cy.wait(TIMEOUTS.ONE_SEC);
        cy.findByTestId('teamFilter').then((el) => {
            const unsortedOptionsText = [];
            el[0].childNodes.forEach((child) => unsortedOptionsText.push(child.innerText));
            const sortedOptionsText = [...unsortedOptionsText].sort((a, b) => a.localeCompare(b, undefined, {sensitivity: 'base'}));
            for (let i = 0; i < unsortedOptionsText.length; i++) {
                expect(unsortedOptionsText[i]).equal(sortedOptionsText[i]);
            }
        });
    });
});