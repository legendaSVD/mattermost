import * as TIMEOUTS from '../../../../../fixtures/timeouts';
import {gotoTeamAndPostImage} from './helpers';
describe('Compliance Export', () => {
    let teamName;
    before(() => {
        cy.shouldNotRunOnCloudEdition();
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
    it('MM-T3439 - Download Compliance Export Files - S3 Bucket Storage', () => {
        cy.visit('/admin_console/environment/file_storage');
        cy.get('.admin-console__header', {timeout: TIMEOUTS.ONE_MIN}).should('be.visible').and('have.text', 'File Storage');
        const {
            minioAccessKey,
            minioSecretKey,
            minioS3Bucket,
            minioS3Endpoint,
            minioS3SSL,
        } = Cypress.env();
        cy.findByTestId('FileSettings.DriverNamedropdown').select('amazons3');
        cy.findByTestId('FileSettings.AmazonS3Bucketinput').clear().type(minioS3Bucket);
        cy.findByTestId('FileSettings.AmazonS3AccessKeyIdinput').clear().type(minioAccessKey);
        cy.findByTestId('FileSettings.AmazonS3SecretAccessKeyinput').clear().type(minioSecretKey);
        cy.findByTestId('FileSettings.AmazonS3Endpointinput').clear().type(minioS3Endpoint);
        cy.findByTestId(`FileSettings.AmazonS3SSL${minioS3SSL}`).check();
        cy.uiSaveConfig();
        cy.findByRole('button', {name: 'Test Connection'}).click();
        cy.findByText('Connection was successful').should('be.visible');
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
});