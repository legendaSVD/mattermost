import {
    downloadAndUnzipExportFile,
    verifyActianceXMLFile,
    verifyPostsCSVFile,
} from './helpers';
describe('Compliance Export', () => {
    const downloadsFolder = Cypress.config('downloadsFolder');
    let newTeam;
    let newChannel;
    let botId;
    let botName;
    before(() => {
        cy.apiRequireLicenseForFeature('Compliance');
        cy.apiUpdateConfig({
            MessageExportSettings: {
                ExportFormat: 'csv',
                DownloadExportResults: true,
            },
            ServiceSettings: {
                EnforceMultifactorAuthentication: false,
            },
        });
        cy.apiCreateCustomAdmin().then(({sysadmin}) => {
            cy.apiLogin(sysadmin);
            cy.apiCreateBot().then(({bot}) => {
                ({user_id: botId, display_name: botName} = bot);
                cy.apiPatchUserRoles(bot.user_id, ['system_admin', 'system_user']);
            });
            cy.apiInitSetup().then(({team, channel}) => {
                newTeam = team;
                newChannel = channel;
                exportCompliance();
            });
        });
    });
    after(() => {
        cy.shellRm('-rf', downloadsFolder);
    });
    it('MM-T1175_1 - UserType identifies that the message is posted by a bot', () => {
        const message = `This is CSV bot message from ${botName} at ${Date.now()}`;
        postBotMessage(newTeam, newChannel, botId, message);
        exportCompliance();
        const targetFolder = `${downloadsFolder}/${Date.now().toString()}`;
        downloadAndUnzipExportFile(targetFolder);
        verifyPostsCSVFile(
            targetFolder,
            'have.string',
            `${message},message,bot`,
        );
    });
    it('MM-T1175_2 - UserType identifies that the message is posted by a bot', () => {
        const message = `This is XML bot message from ${botName} at ${Date.now()}`;
        postBotMessage(newTeam, newChannel, botId, message);
        exportCompliance('Actiance XML');
        const targetFolder = `${downloadsFolder}/${Date.now().toString()}`;
        downloadAndUnzipExportFile(targetFolder);
        verifyActianceXMLFile(
            targetFolder,
            'have.string',
            message,
        );
        verifyActianceXMLFile(
            targetFolder,
            'have.string',
            '<UserType>bot</UserType>',
        );
    });
});
function postBotMessage(newTeam, newChannel, botId, message) {
    cy.apiCreateToken(botId).then(({token}) => {
        cy.apiLogout();
        cy.apiCreatePost(newChannel.id, message, '', {attachments: [{pretext: 'Look some text', text: 'This is text'}]}, token);
        cy.apiAdminLogin();
        cy.visit(`/${newTeam.name}/channels/${newChannel.name}`);
        cy.findByText(message).should('be.visible');
    });
}
function exportCompliance(type) {
    cy.uiGoToCompliancePage();
    cy.uiEnableComplianceExport(type);
    cy.uiExportCompliance();
}