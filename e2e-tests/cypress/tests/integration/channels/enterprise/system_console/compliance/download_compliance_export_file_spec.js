import {
    downloadAndUnzipExportFile,
    editLastPost,
    gotoTeamAndPostImage,
    verifyActianceXMLFile,
    verifyPostsCSVFile,
} from './helpers';
describe('Compliance Export', () => {
    const ExportFormatActiance = 'Actiance XML';
    const downloadsFolder = Cypress.config('downloadsFolder');
    let newTeam;
    let newUser;
    let newChannel;
    let adminUser;
    before(() => {
        cy.apiRequireLicenseForFeature('Compliance');
        cy.apiUpdateConfig({
            MessageExportSettings: {
                ExportFormat: 'csv',
                DownloadExportResults: true,
            },
        });
        cy.apiCreateCustomAdmin().then(({sysadmin}) => {
            adminUser = sysadmin;
            cy.apiLogin(adminUser);
            cy.apiInitSetup().then(({team, user, channel}) => {
                newTeam = team;
                newUser = user;
                newChannel = channel;
            });
        });
    });
    after(() => {
        cy.shellRm('-rf', downloadsFolder);
    });
    it('MM-T1172 - Compliance Export - Deleted file is indicated in CSV File Export', () => {
        cy.uiGoToCompliancePage();
        cy.uiEnableComplianceExport();
        cy.visit(`/${newTeam.name}/channels/town-square`);
        gotoTeamAndPostImage();
        cy.uiGoToCompliancePage();
        cy.uiExportCompliance();
        deleteLastPost();
        cy.uiGoToCompliancePage();
        cy.uiExportCompliance();
        const targetFolder = `${downloadsFolder}/${Date.now().toString()}`;
        downloadAndUnzipExportFile(targetFolder);
        verifyPostsCSVFile(
            targetFolder,
            'have.string',
            'deleted attachment',
        );
    });
    it('MM-T1173 - Compliance Export - Deleted file is indicated in Actiance XML File Export', () => {
        cy.uiGoToCompliancePage();
        cy.uiEnableComplianceExport(ExportFormatActiance);
        cy.visit(`/${newTeam.name}/channels/town-square`);
        gotoTeamAndPostImage();
        cy.uiGoToCompliancePage();
        cy.uiExportCompliance();
        deleteLastPost();
        cy.uiGoToCompliancePage();
        cy.uiExportCompliance();
        const targetFolder = `${downloadsFolder}/${Date.now().toString()}`;
        downloadAndUnzipExportFile(targetFolder);
        verifyActianceXMLFile(
            targetFolder,
            'have.string',
            'delete file uploaded-image-400x400.jpg',
        );
        cy.shellFind(targetFolder, /image-400x400.jpg/).then((files) => {
            expect(files.length).not.to.equal(0);
        });
    });
    it('MM-T1176 - Compliance export should include updated post after editing', () => {
        cy.uiGoToCompliancePage();
        cy.uiEnableComplianceExport(ExportFormatActiance);
        cy.visit(`/${newTeam.name}/channels/town-square`);
        cy.postMessage('Testing');
        cy.uiGoToCompliancePage();
        cy.uiExportCompliance();
        cy.visit(`/${newTeam.name}/channels/town-square`);
        editLastPost('Hello');
        cy.uiGoToCompliancePage();
        cy.uiExportCompliance();
        const targetFolder = `${downloadsFolder}/${Date.now().toString()}`;
        downloadAndUnzipExportFile(targetFolder);
        verifyActianceXMLFile(
            targetFolder,
            'have.string',
            '<Content>Hello</Content>',
        );
    });
    it('MM-T3305 - Verify Deactivated users are displayed properly in Compliance Exports', () => {
        cy.postMessageAs({
            sender: adminUser,
            message: `@${newUser.username} : Admin 1`,
            channelId: newChannel.id,
        });
        cy.visit(`/${newTeam.name}/channels/${newChannel.id}`);
        cy.apiDeactivateUser(newUser.id);
        cy.uiGoToCompliancePage();
        cy.uiEnableComplianceExport(ExportFormatActiance);
        cy.uiExportCompliance();
        let targetFolder = `${downloadsFolder}/${Date.now().toString()}`;
        downloadAndUnzipExportFile(targetFolder);
        verifyActianceXMLFile(
            targetFolder,
            'have.string',
            `<LoginName>${newUser.username}@sample.mattermost.com</LoginName>`,
        );
        cy.postMessageAs({
            sender: adminUser,
            message: `@${newUser.username} : Admin2`,
            channelId: newChannel.id,
        });
        cy.uiGoToCompliancePage();
        cy.uiExportCompliance();
        targetFolder = `${downloadsFolder}/${Date.now().toString()}`;
        downloadAndUnzipExportFile(targetFolder);
        verifyActianceXMLFile(
            targetFolder,
            'not.have.string',
            `<LoginName>${newUser.username}@sample.mattermost.com</LoginName>`,
        );
        cy.apiActivateUser(newUser.id);
        cy.postMessageAs({
            sender: adminUser,
            message: `@${newUser.username} : Admin3`,
            channelId: newChannel.id,
        });
        cy.uiGoToCompliancePage();
        cy.uiExportCompliance();
        targetFolder = `${downloadsFolder}/${Date.now().toString()}`;
        downloadAndUnzipExportFile(targetFolder);
        verifyActianceXMLFile(
            targetFolder,
            'have.string',
            `<LoginName>${newUser.username}@sample.mattermost.com</LoginName>`,
        );
    });
});
function deleteLastPost() {
    cy.apiGetTeamsForUser().then(({teams}) => {
        const team = teams[0];
        cy.visit(`/${team.name}/channels/town-square`);
        cy.getLastPostId().then((lastPostId) => {
            cy.clickPostDotMenu(lastPostId);
            cy.get(`#CENTER_dropdown_${lastPostId}`).should('exist').within(() => {
                cy.findByText('Delete').should('exist').click();
            });
        });
        cy.get('.a11y__modal.modal-dialog').should('exist').and('be.visible').
            within(() => {
                cy.findByText('Delete').should('be.visible').click();
            });
    });
}