declare namespace Cypress {
    interface Chainable {
        apiGetSAMLCertificateStatus(): Chainable<Response>;
        apiGetMetadataFromIdp(samlMetadataUrl: string): Chainable<Response>;
        apiUploadSAMLIDPCert(filePath: string): Chainable<Response>;
        apiUploadSAMLPublicCert(filePath: string): Chainable<Response>;
        apiUploadSAMLPrivateKey(filePath: string): Chainable<Response>;
    }
}