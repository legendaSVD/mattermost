import {verifyExportedMessagesCount, editLastPost} from './helpers';
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
    it('MM-T1177_1 - Compliance export should include updated posts after editing multiple times, exporting multiple times', () => {
        cy.visit(`/${teamName}/channels/town-square`);
        cy.postMessage('Testing one');
        cy.postMessage('Testing two');
        editLastPost('This is Edit Post');
        cy.uiGoToCompliancePage();
        cy.uiExportCompliance();
        verifyExportedMessagesCount('3');
    });
    it('MM-T1177_2 - Compliance export should include updated posts after editing multiple times, exporting multiple times', () => {
        cy.visit(`/${teamName}/channels/town-square`);
        cy.postMessage('Testing');
        editLastPost('This is Edit One');
        cy.postMessage('This is Edit Two');
        cy.uiGoToCompliancePage();
        cy.uiExportCompliance();
        verifyExportedMessagesCount('3');
    });
    it('MM-T1177_3 - Compliance export should include updated posts after editing multiple times, exporting multiple times', () => {
        cy.visit(`/${teamName}/channels/town-square`);
        cy.postMessage('Testing');
        cy.uiGoToCompliancePage();
        cy.uiExportCompliance();
        cy.visit(`/${teamName}/channels/town-square`);
        editLastPost('This is Edit Three');
        cy.uiGoToCompliancePage();
        cy.uiExportCompliance();
        verifyExportedMessagesCount('2');
    });
    it('MM-T1177_4 - Compliance export should include updated posts after editing multiple times, exporting multiple times', () => {
        cy.visit(`/${teamName}/channels/town-square`);
        cy.postMessage('Testing');
        cy.uiGoToCompliancePage();
        cy.uiExportCompliance();
        cy.visit(`/${teamName}/channels/town-square`);
        editLastPost('This is Edit Three');
        cy.postMessage('This is the post');
        cy.uiGoToCompliancePage();
        cy.uiExportCompliance();
        verifyExportedMessagesCount('3');
    });
    it('MM-T1177_5 - Compliance export should include updated posts after editing multiple times, exporting multiple times', () => {
        cy.visit(`/${teamName}/channels/town-square`);
        cy.postMessage('Testing');
        editLastPost('This is Edit Four');
        editLastPost('This is Edit Five');
        cy.uiGoToCompliancePage();
        cy.uiExportCompliance();
        verifyExportedMessagesCount('3');
    });
});