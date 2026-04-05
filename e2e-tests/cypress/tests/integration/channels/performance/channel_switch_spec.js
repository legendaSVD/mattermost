import {measurePerformance} from './utils.js';
describe('Channel switch performance test', () => {
    let teamName;
    before(() => {
        cy.apiInitSetup({loginAfter: true}).then(({team}) => {
            teamName = team;
            cy.visit(`/${team.name}/channels/town-square`);
            cy.get('#sidebarItem_off-topic').should('be.visible');
        });
    });
    it('measures switching between two channels from LHS', () => {
        measurePerformance(
            'channelLoad',
            800,
            () => {
                cy.get('#sidebarItem_off-topic').click({force: true});
                return expectActiveChannelToBe('Off-Topic', '/off-topic');
            },
            () => {
                cy.visit(`/${teamName.name}/channels/town-square`);
                cy.get('#sidebarItem_off-topic').should('be.visible');
            },
        );
    });
});
const expectActiveChannelToBe = (title, url) => {
    cy.get('#channelHeaderTitle').
        should('be.visible').
        and('contain.text', title);
    cy.get('#app-content').should('be.visible');
    return cy.url().should('contain', url);
};