declare namespace Cypress {
    interface Chainable {
        apiUploadFile(name: string, filePath: string, options: Record<string, unknown>): Chainable<Response>;
        apiDownloadFileAndVerifyContentType(fileURL: string, contentType: string): Chainable;
    }
}