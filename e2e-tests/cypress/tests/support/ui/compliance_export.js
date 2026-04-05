import * as TIMEOUTS from '../../fixtures/timeouts';
Cypress.Commands.add('uiEnableComplianceExport', (exportFormat = 'csv') => {
    cy.findByText('Enable Compliance Export:').should('be.visible');
    cy.findByText('Compliance Export Time:').should('be.visible');
    cy.findByText('Export Format:').should('be.visible');
    cy.findByRole('radio', {name: /false/i}).click();
    cy.findByRole('radio', {name: /true/i}).click();
    cy.findByTestId('exportFormatdropdown').should('be.visible').select(exportFormat);
    cy.uiSaveConfig({confirm: true});
});
Cypress.Commands.add('uiGoToCompliancePage', () => {
    cy.visit('/admin_console/compliance/export');
    cy.get('.admin-console__header', {timeout: TIMEOUTS.TWO_MIN}).should('be.visible').invoke('text').should('include', 'Compliance Export');
});
Cypress.Commands.add('uiExportCompliance', () => {
    cy.findByRole('button', {name: /run compliance export job now/i}).click();
    cy.wait(TIMEOUTS.THREE_SEC);
    cy.get('.job-table__table').find('tbody > tr').eq(0).as('firstRow');
    cy.get('.job-table__table').find('thead > tr').as('firstheader');
    cy.waitUntil(() => {
        return cy.get('@firstRow').find('td:eq(0)').then((el) => {
            return el[0].innerText.trim() === 'Success';
        });
    },
    {
        timeout: TIMEOUTS.FIVE_MIN,
        interval: TIMEOUTS.ONE_SEC,
        errorMsg: 'Compliance export did not finish in time',
    });
});