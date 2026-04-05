import * as TIMEOUTS from '../../../fixtures/timeouts';
import {
    attachFile,
    downloadAttachmentAndVerifyItsProperties,
    interceptFileUpload,
    waitUntilUploadComplete,
} from './helpers';
describe('Upload Files - Image', () => {
    before(() => {
        cy.apiInitSetup({loginAfter: true}).then(({channelUrl}) => {
            cy.visit(channelUrl);
            cy.postMessage('hello');
        });
    });
    beforeEach(() => {
        interceptFileUpload();
    });
    it('MM-T2264_1 - JPG', () => {
        const properties = {
            filePath: 'mm_file_testing/Images/JPG.jpg',
            fileName: 'JPG.jpg',
            originalWidth: 400,
            originalHeight: 479,
            mimeType: 'image/jpg',
        };
        testImage(properties);
    });
    it('MM-T2264_2 - PNG', () => {
        const properties = {
            filePath: 'mm_file_testing/Images/PNG.png',
            fileName: 'PNG.png',
            originalWidth: 400,
            originalHeight: 479,
            mimeType: 'image/png',
        };
        testImage(properties);
    });
    it('MM-T2264_3 - BMP', () => {
        const properties = {
            filePath: 'mm_file_testing/Images/BMP.bmp',
            fileName: 'BPM.bmp',
            originalWidth: 400,
            originalHeight: 479,
            mimeType: 'image/bmp',
        };
        testImage(properties);
    });
    it('MM-T2264_4 - GIF', () => {
        const properties = {
            filePath: 'mm_file_testing/Images/GIF.gif',
            fileName: 'GIF.gif',
            originalWidth: 500,
            originalHeight: 500,
            mimeType: 'image/gif',
        };
        testImage(properties);
    });
    it('MM-T2264_5 - TIFF', () => {
        const properties = {
            filePath: 'mm_file_testing/Images/TIFF.tif',
            fileName: 'TIFF.tif',
            originalWidth: 400,
            originalHeight: 479,
            mimeType: 'image/tiff',
        };
        testImage(properties);
    });
    it('MM-T2264_7 - WEBP', () => {
        const properties = {
            filePath: 'mm_file_testing/Images/WEBP.webp',
            fileName: 'WEBP.webp',
            originalWidth: 640,
            originalHeight: 426,
            mimeType: 'image/webp',
        };
        testImage(properties);
    });
});
function testImage(properties) {
    const {fileName, originalWidth, originalHeight} = properties;
    const aspectRatio = originalWidth / originalHeight;
    cy.postMessage(fileName);
    attachFile(properties);
    waitUntilUploadComplete();
    cy.uiGetPostTextBox().clear().type('{enter}');
    cy.wait(TIMEOUTS.FIVE_SEC);
    cy.uiGetFileThumbnail(fileName).click();
    cy.uiGetFilePreviewModal().as('filePreviewModal');
    cy.get('@filePreviewModal').uiGetContentFilePreviewModal().find('img').should((img) => {
        expect(img.width() / img.height()).to.be.closeTo(aspectRatio, 0.01);
    });
    cy.get('@filePreviewModal').uiGetDownloadFilePreviewModal().then((downloadLink) => {
        cy.wrap(downloadLink).parent().should('have.attr', 'download', fileName).then((link) => {
            const fileAttachmentURL = link.attr('href');
            downloadAttachmentAndVerifyItsProperties(fileAttachmentURL, fileName, 'attachment');
        });
    });
    cy.uiCloseFilePreviewModal();
}