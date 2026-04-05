import * as TIMEOUTS from '../../../fixtures/timeouts';
export function downloadAttachmentAndVerifyItsProperties(fileURL, filename, httpContext) {
    cy.request(fileURL).then((response) => {
        expect(response.status).to.equal(200);
        expect(response.headers['content-disposition']).to.
            equal(`${httpContext};filename="${filename}"; filename*=UTF-8''${filename}`);
    });
}
export function interceptFileUpload() {
    cy.intercept({
        method: 'POST',
        url: '/api/v4/files',
    }).as('fileUpload');
}
export function waitUntilUploadComplete() {
    cy.wait('@fileUpload', {timeout: TIMEOUTS.TEN_SEC}).then((interception) => {
        const fileInfo = interception.response.body.file_infos[0];
        cy.log(`file id: ${fileInfo.id}`);
    });
    cy.wait(TIMEOUTS.ONE_SEC);
    const options = {
        timeout: TIMEOUTS.HALF_MIN,
        interval: TIMEOUTS.HALF_SEC,
        errorMsg: 'File upload did not complete in time',
    };
    cy.waitUntil(() => cy.get('#postCreateFooter').then((el) => {
        return el.find('.post-image__uploadingTxt').length === 0;
    }), options);
    cy.wait(TIMEOUTS.ONE_SEC);
}
export function attachFile({filePath, fileName, mimeType}) {
    cy.fixture(filePath, 'binary').
        then(Cypress.Blob.binaryStringToBlob).
        then((fileContent) => {
            cy.get('#advancedTextEditorCell').find('#fileUploadInput').attachFile({
                fileContent,
                fileName,
                mimeType: mimeType || 'application/octet-stream',
                encoding: 'utf8',
            });
        });
}