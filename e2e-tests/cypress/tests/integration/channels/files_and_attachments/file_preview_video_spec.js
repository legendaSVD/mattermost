import * as TIMEOUTS from '../../../fixtures/timeouts';
import {
    attachFile,
    downloadAttachmentAndVerifyItsProperties,
    interceptFileUpload,
    waitUntilUploadComplete,
} from './helpers';
describe('Upload Files - Video', () => {
    before(() => {
        cy.apiInitSetup({loginAfter: true}).then(({channelUrl}) => {
            cy.visit(channelUrl);
            cy.postMessage('hello');
        });
    });
    beforeEach(() => {
        interceptFileUpload();
    });
    it('MM-T3826_1 - MP4', () => {
        const properties = {
            filePath: 'mm_file_testing/Video/MP4.mp4',
            fileName: 'MP4.mp4',
            shouldPreview: true,
        };
        testVideoFile(properties);
    });
    it('MM-T3826_2 - AVI', () => {
        const properties = {
            filePath: 'mm_file_testing/Video/AVI.avi',
            fileName: 'AVI.avi',
            mimeType: 'video/x-msvideo',
            shouldPreview: false,
        };
        testVideoFile(properties);
    });
    it('MM-T3826_3 - MKV', () => {
        const properties = {
            filePath: 'mm_file_testing/Video/MKV.mkv',
            fileName: 'MKV.mkv',
            shouldPreview: false,
        };
        testVideoFile(properties);
    });
    it('MM-T3826_4 - MOV', () => {
        const properties = {
            filePath: 'mm_file_testing/Video/MOV.mov',
            fileName: 'MOV.mov',
            shouldPreview: false,
        };
        testVideoFile(properties);
    });
    it('MM-T3826_5 - MPG', () => {
        const properties = {
            filePath: 'mm_file_testing/Video/MPG.mpg',
            fileName: 'MPG.mpg',
            mimeType: 'video/mpeg',
            shouldPreview: false,
        };
        testVideoFile(properties);
    });
    it('MM-T3826_6 - WEBM', () => {
        const properties = {
            filePath: 'mm_file_testing/Video/WEBM.webm',
            fileName: 'WEBM.webm',
            mimeType: 'video/webm',
            shouldPreview: true,
        };
        testVideoFile(properties);
    });
    it('MM-T3826_7 - WMV', () => {
        const properties = {
            filePath: 'mm_file_testing/Video/WMV.wmv',
            fileName: 'WMV.wmv',
            shouldPreview: false,
        };
        testVideoFile(properties);
    });
});
export function testVideoFile(properties) {
    const {fileName, shouldPreview} = properties;
    cy.postMessage(fileName);
    attachFile(properties);
    waitUntilUploadComplete();
    cy.uiGetPostTextBox().clear().type('{enter}');
    cy.wait(TIMEOUTS.ONE_SEC);
    cy.uiGetFileThumbnail(fileName).click();
    cy.uiGetFilePreviewModal().as('filePreviewModal');
    if (shouldPreview) {
        cy.get('@filePreviewModal').get('video').should('exist');
    }
    cy.get('@filePreviewModal').uiGetDownloadFilePreviewModal().then((downloadLink) => {
        cy.wrap(downloadLink).parent().should('have.attr', 'download', fileName).then((link) => {
            const fileAttachmentURL = link.attr('href');
            downloadAttachmentAndVerifyItsProperties(fileAttachmentURL, fileName, 'attachment');
        });
    });
    cy.uiCloseFilePreviewModal();
}