declare namespace Cypress {
    interface Chainable {
        uiGetFileThumbnail(filename: string): Chainable;
        uiGetFileUploadPreview(): Chainable;
        uiGetFileUploadPreview(): Chainable;
        uiGetFilePreviewModal(option: Record<string, boolean>): Chainable;
        uiGetPublicLink(option: Record<string, boolean>): Chainable;
        uiOpenFilePreviewModal(filename: string): Chainable;
        uiCloseFilePreviewModal(): Chainable;
        uiGetContentFilePreviewModal(): Chainable;
        uiGetDownloadLinkFilePreviewModal(): Chainable;
        uiGetDownloadFilePreviewModal(): Chainable;
        uiGetArrowLeftFilePreviewModal(): Chainable;
        uiGetArrowRightFilePreviewModal(): Chainable;
    }
}