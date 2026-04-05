import path from 'path';
import * as TIMEOUTS from '../../../../../fixtures/timeouts';
export function downloadAndUnzipExportFile(targetFolder = '') {
    cy.get('@firstRow').findByText('Download').parents('a').should('exist').then((fileAttachment) => {
        const fileURL = fileAttachment.attr('href');
        const targetFilePath = path.join(targetFolder);
        const zipFile = targetFilePath + '.zip';
        cy.request({url: fileURL, encoding: 'binary'}).then((response) => {
            expect(response.status).to.equal(200);
            cy.writeFile(zipFile, response.body, 'binary');
        });
        cy.shellUnzip(zipFile, targetFilePath);
        cy.shellFind(targetFilePath, /csv_export.zip/).then((files) => {
            cy.shellUnzip(files[files.length - 1], targetFilePath);
        });
    });
}
export function verifyPostsCSVFile(targetFolder, type, match) {
    cy.readFile(`${targetFolder}/posts.csv`).
        should('exist').
        and(type, match);
}
export function verifyActianceXMLFile(targetFolder, type, match) {
    cy.readFile(`${targetFolder}/actiance_export.xml`).
        should('exist').
        and(type, match);
}
export function verifyExportedMessagesCount(expectedNumber) {
    cy.get('@firstRow').find('td:eq(4)').should('have.text', `${expectedNumber} messages exported.`);
}
export function editLastPost(message) {
    cy.getLastPostId().then(() => {
        cy.uiGetPostTextBox().clear().type('{uparrow}');
        cy.get('#edit_textbox').should('be.visible');
        cy.get('#edit_textbox').invoke('val', '').type(message);
        cy.get('#create_post').findByText('Save').should('be.visible').click();
        cy.get('#edit_textbox').should('not.exist');
    });
}
export function gotoTeamAndPostImage() {
    cy.uiGetPostTextBox().then((createPostEl) => {
        if (createPostEl.find('.file-preview__container').length === 1) {
            cy.waitUntil(() => cy.uiGetFileUploadPreview().then((filePreviewEl) => {
                if (filePreviewEl.find('.post-image.normal').length > 0) {
                    cy.get('.file-preview__remove > .icon').click();
                }
                return filePreviewEl.find('.post-image.normal').length === 0;
            }));
        }
        const file = {
            filename: 'image-400x400.jpg',
            originalSize: {width: 400, height: 400},
            thumbnailSize: {width: 400, height: 400},
        };
        cy.get('#fileUploadInput').attachFile(file.filename);
        cy.uiWaitForFileUploadPreview();
        cy.postMessage(`file uploaded-${file.filename}`);
    });
}
export function gotoGlobalPolicy() {
    cy.get('#global_policy_table .DataGrid .MenuWrapper').trigger('mouseover').click();
    cy.findByRole('button', {name: /edit/i}).should('be.visible').click();
    cy.get('.DataRetentionSettings .admin-console__header', {timeout: TIMEOUTS.TWO_MIN}).should('be.visible').invoke('text').should('include', 'Global Retention Policy');
}
export function editGlobalPolicyMessageRetention(input, result) {
    cy.get('.DataRetentionSettings #global_direct_message_dropdown #DropdownInput_channel_message_retention').as('dropDown');
    cy.request({
        headers: {'X-Requested-With': 'XMLHttpRequest'},
        url: '/api/v4/data_retention/policy',
        method: 'GET',
    }).then((response) => {
        expect(response.status).to.equal(200);
        if (response.body.message_deletion_enabled === true) {
            cy.get('@dropDown').click();
            cy.get('.channel_message_retention_dropdown__menu .channel_message_retention_dropdown__option span.option_forever').should('be.visible').click();
        }
    });
    cy.get('@dropDown').click();
    cy.get('.channel_message_retention_dropdown__menu .channel_message_retention_dropdown__option span.option_days').should('be.visible').click();
    cy.get('.DataRetentionSettings #global_direct_message_dropdown input#channel_message_retention_input').clear().type(input);
    cy.findByRole('button', {name: 'Save'}).should('be.visible').click();
    cy.get('#global_policy_table .DataGrid').should('be.visible');
    cy.findByTestId('global_message_retention_cell').within(() => {
        cy.get('span').should('have.text', result);
    });
}
export function editGlobalPolicyFileRetention(input, result) {
    cy.get('.DataRetentionSettings #global_file_dropdown #DropdownInput_file_retention').should('be.visible').click();
    cy.get('.file_retention_dropdown__menu .file_retention_dropdown__option span.option_days').should('be.visible').click();
    cy.get('.DataRetentionSettings #global_file_dropdown input#file_retention_input').clear().type(input);
    cy.findByRole('button', {name: 'Save'}).should('be.visible').click();
    cy.get('#global_policy_table .DataGrid').should('be.visible');
    cy.findByTestId('global_file_retention_cell').within(() => {
        cy.get('span').should('have.text', result);
    });
}
export function runDataRetentionAndVerifyPostDeleted(testTeam, testChannel, postText) {
    cy.uiGoToDataRetentionPage();
    cy.findByRole('button', {name: 'Run Deletion Job Now'}).click();
    cy.wait(TIMEOUTS.FIVE_SEC);
    cy.get('.job-table__table').find('tbody > tr').eq(0).as('firstRow');
    cy.get('@firstRow').within(() => {
        cy.get('td:eq(0)', {timeout: TIMEOUTS.FOUR_MIN}).should('have.text', 'Success');
    });
    cy.visit(`/${testTeam.name}/channels/${testChannel.name}`);
    cy.reload();
    cy.findAllByTestId('postView').should('have.length', 1);
    cy.findAllByTestId('postView').should('not.contain', postText);
}
export function verifyPostNotDeleted(testTeam, testChannel, postText, expectedNoOfPosts = 2) {
    cy.visit(`/${testTeam.name}/channels/${testChannel.name}`);
    cy.findAllByTestId('postView').should('have.length', expectedNoOfPosts);
    if (expectedNoOfPosts === 2) {
        cy.findAllByTestId('postView').should('contain', postText);
    } else {
        cy.findAllByTestId('postView').should('not.contain', postText);
    }
}