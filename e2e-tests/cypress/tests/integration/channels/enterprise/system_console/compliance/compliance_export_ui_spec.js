import * as TIMEOUTS from '../../../../../fixtures/timeouts';
import {verifyExportedMessagesCount, gotoTeamAndPostImage} from './helpers';
describe('Compliance Export', () => {
    let teamName;
    before(() => {
        cy.apiRequireLicenseForFeature('Compliance');
        cy.apiUpdateConfig({
            MessageExportSettings: {
                ExportFormat: 'csv',
                DownloadExportResults: true,
            },
        });
        cy.apiCreateCustomAdmin().then(({sysadmin}) => {
            cy.apiLogin(sysadmin);
            cy.apiInitSetup().then(({team}) => {
                teamName = team.name;
            });
            cy.visit('/');
            cy.postMessage('hello');
            cy.uiGoToCompliancePage();
            cy.uiEnableComplianceExport();
            cy.uiExportCompliance();
        });
    });
    it('MM-T3435 - Download Compliance Export Files - CSV Format', () => {
        cy.visit(`/${teamName}/channels/town-square`);
        gotoTeamAndPostImage();
        cy.uiGoToCompliancePage();
        cy.uiExportCompliance();
        cy.get('.job-table__table').find('tbody > tr').eq(0).as('firstRow');
        cy.get('@firstRow').findByText('Download').parents('a').should('exist').then((fileAttachment) => {
            const fileURL = fileAttachment.attr('href');
            cy.apiDownloadFileAndVerifyContentType(fileURL);
        });
    });
    it('MM-T3438 - Download Compliance Export Files when 0 messages exported', () => {
        cy.visit(`/${teamName}/channels/town-square`);
        gotoTeamAndPostImage();
        cy.uiGoToCompliancePage();
        cy.uiExportCompliance();
        cy.get('.job-table__table').find('tbody > tr').eq(0).as('firstRow');
        cy.get('@firstRow').findByText('Download').parents('a').should('exist').then((fileAttachment) => {
            const fileURL = fileAttachment.attr('href');
            cy.apiDownloadFileAndVerifyContentType(fileURL);
            cy.uiExportCompliance();
            cy.get('.job-table__table').
                find('tbody > tr:eq(0)').
                findByText('Download').should('not.exist');
        });
    });
    it('MM-T1168 - Compliance Export - Run Now, entry appears in job table', () => {
        cy.visit(`/${teamName}/channels/town-square`);
        gotoTeamAndPostImage();
        cy.uiGoToCompliancePage();
        cy.uiExportCompliance();
        cy.get('.job-table__table').find('tbody > tr').eq(0).as('firstRow');
        cy.get('@firstheader').within(() => {
            cy.get('th:eq(0)').should('have.text', 'Status');
            cy.get('th:eq(1)').should('have.text', 'Finish Time');
            cy.get('th:eq(2)').should('have.text', 'Run Time');
            cy.get('th:eq(3)').should('have.text', 'Files');
            cy.get('th:eq(4)').should('have.text', 'Details');
        });
        cy.get('@firstRow').within(() => {
            cy.get('td:eq(0)').should('have.text', 'Success');
            cy.get('td:eq(2)').contains('seconds');
            cy.get('td:eq(3)').should('have.text', 'Download');
            cy.get('td:eq(4)').should('have.text', '1 messages exported.');
        });
    });
    it('MM-T1169 - Compliance Export - CSV and Global Relay', () => {
        cy.visit(`/${teamName}/channels/town-square`);
        gotoTeamAndPostImage();
        Cypress._.times(9, (i) => {
            cy.postMessage(`This is the post ${i}`);
        });
        cy.uiGoToCompliancePage();
        cy.uiExportCompliance();
        verifyExportedMessagesCount('10');
    });
    it('MM-T1165 - Compliance Export - Fields disabled when disabled', () => {
        cy.uiGoToCompliancePage();
        cy.findByTestId('enableComplianceExportfalse').click();
        cy.findByRole('button', {name: /run compliance export job now/i}).should('be.not.enabled');
    });
    it('MM-T1167 - Compliance Export job can be canceled', () => {
        cy.uiGoToCompliancePage();
        cy.uiEnableComplianceExport();
        cy.findByRole('button', {name: /run compliance export job now/i}).click();
        cy.findByTitle(/cancel/i, {timeout: TIMEOUTS.FIVE_SEC}).should('be.visible').click();
        cy.get('.job-table__table').find('tbody > tr').eq(0).as('firstRow');
        cy.get('@firstRow').find('td:eq(0)').should('have.text', 'Canceled');
    });
});