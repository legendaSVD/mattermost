import * as TIMEOUTS from '../../../../fixtures/timeouts';
describe('Settings', () => {
    before(() => {
        cy.apiRequireLicense();
    });
    it('MM-T1181 Compliance and Auditing: Run a report, it appears in the job table', () => {
        cy.visit('/admin_console/compliance/monitoring');
        cy.findByTestId('ComplianceSettings.Enabletrue').click();
        cy.findByTestId('saveSetting').should('be.enabled').click().wait(TIMEOUTS.HALF_SEC);
        cy.get('#desc').clear().type('sample report');
        const now = new Date();
        cy.get('#to').clear().type(now.toLocaleDateString());
        now.setDate(now.getDate() - 1);
        cy.get('#from').clear().type(now.toLocaleDateString());
        cy.get('#run-button').click().wait(TIMEOUTS.HALF_SEC);
        cy.findByText('Reload Completed Compliance Reports').click().wait(TIMEOUTS.HALF_SEC);
        cy.get('.compliance-panel__table tbody').children().should('have.length.greaterThan', 0);
        cy.get('.compliance-panel__table tbody tr').first().should('contain.text', 'Download');
        cy.get('.compliance-panel__table tbody tr').first().should('contain.text', 'sample report');
    });
    it('MM-T1635 Channel listing is displayed correctly with proper team name', () => {
        let teamName;
        cy.visit('/admin_console/user_management/channels');
        cy.get('#channels .DataGrid .DataGrid_rows > :nth-child(1)').
            within(() => {
                cy.get('.DataGrid_cell:nth-of-type(2)').
                    invoke('text').
                    then((name) => {
                        teamName = name;
                        return cy.get('.DataGrid_cell').first().click();
                    });
            }).then(() => {
                cy.get('#channel_profile .channel-team').should('have.text', 'Team' + teamName);
            });
    });
});