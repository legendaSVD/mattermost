import * as TIMEOUTS from '../../../fixtures/timeouts';
describe('Messaging - Opening a private channel using keyboard shortcuts', () => {
    let testTeam;
    before(() => {
        cy.apiInitSetup({loginAfter: true}).then(({team}) => {
            testTeam = team;
            cy.visit(`/${testTeam.name}/channels/off-topic`);
        });
    });
    it('MM-T1225 CTRL/CMD+K - Open private channel using arrow keys and Enter', () => {
        cy.apiCreateChannel(testTeam.id, 'private-channel', 'Private channel', 'P').then(() => {
            cy.wait(TIMEOUTS.HALF_SEC);
            cy.typeCmdOrCtrl().type('K', {release: true});
            cy.findByRole('combobox', {name: 'quick switch input'}).type('Pr').type('{downarrow}').type('{enter}');
            cy.get('#channelHeaderTitle').should('be.visible').should('contain', 'Private').wait(TIMEOUTS.HALF_SEC);
            cy.uiGetPostTextBox().should('be.focused');
        });
    });
});