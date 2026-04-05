import {Team} from '@mattermost/types/teams';
describe('Collapsed Reply Threads', () => {
    let testTeam: Team;
    before(() => {
        cy.apiUpdateConfig({
            ServiceSettings: {
                ThreadAutoFollow: true,
                CollapsedThreads: 'default_off',
            },
        });
        cy.apiInitSetup({loginAfter: true}).then(({team, channel}) => {
            testTeam = team;
            cy.visit(`/${testTeam.name}/channels/${channel.name}`);
        });
    });
    it('MM-T4140 should be able to toggle CRT on/off', () => {
        cy.uiChangeCRTDisplaySetting('OFF');
        cy.get('.SidebarGlobalThreads').should('not.exist');
        cy.uiChangeCRTDisplaySetting('ON');
        cy.get('.SidebarGlobalThreads').should('exist');
        cy.visit(`/${testTeam.name}/threads`);
        cy.get('h3.no-results__title').should('have.text', 'No followed threads yet');
    });
});