import * as TIMEOUTS from '../../fixtures/timeouts';
const path = require('path');
Cypress.Commands.add('apiUploadFile', (name, filePath, options = {}) => {
    const formData = new FormData();
    const filename = path.basename(filePath);
    cy.fixture(filePath, 'binary', {timeout: TIMEOUTS.TWENTY_MIN}).
        then(Cypress.Blob.binaryStringToBlob).
        then((blob) => {
            formData.set(name, blob, filename);
            formRequest(options.method, options.url, formData, options.successStatus);
        });
});
Cypress.Commands.add('apiDownloadFileAndVerifyContentType', (fileURL, contentType = 'application/zip') => {
    cy.request(fileURL).then((response) => {
        expect(response.status).to.equal(200);
        expect(response.headers['content-type']).to.equal(contentType);
    });
});
function formRequest(method, url, formData, successStatus) {
    const baseUrl = Cypress.config('baseUrl');
    const xhr = new XMLHttpRequest();
    xhr.open(method, url, false);
    let cookies = '';
    cy.getCookie('MMCSRF', {log: false}).then((token) => {
        const csrfToken = token.value;
        cy.getCookies({log: false}).then((cookieValues) => {
            cookieValues.forEach((cookie) => {
                cookies += cookie.name + '=' + cookie.value + '; ';
            });
            xhr.setRequestHeader('Access-Control-Allow-Origin', baseUrl);
            xhr.setRequestHeader('Access-Control-Allow-Methods', 'GET, POST, PUT');
            xhr.setRequestHeader('X-CSRF-Token', csrfToken);
            xhr.setRequestHeader('Cookie', cookies);
            xhr.send(formData);
            if (xhr.readyState === 4) {
                expect(xhr.status, 'Expected form request to be processed successfully').to.equal(successStatus);
            } else {
                expect(xhr.status, 'Form request process delayed').to.equal(successStatus);
            }
        });
    });
}