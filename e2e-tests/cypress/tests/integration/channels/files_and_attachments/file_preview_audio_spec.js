import * as TIMEOUTS from '../../../fixtures/timeouts';
import {
    attachFile,
    downloadAttachmentAndVerifyItsProperties,
    interceptFileUpload,
    waitUntilUploadComplete,
} from './helpers';
describe('Upload Files - Audio', () => {
    before(() => {
        cy.apiInitSetup({loginAfter: true}).then(({channelUrl}) => {
            cy.visit(channelUrl);
            cy.postMessage('hello');
        });
    });
    beforeEach(() => {
        interceptFileUpload();
    });
    it('MM-T3825_1 - MP3', () => {
        const properties = {
            filePath: 'mm_file_testing/Audio/MP3.mp3',
            fileName: 'MP3.mp3',
            mimeType: 'audio/mpeg',
            shouldPreview: true,
        };
        testAudioFile(properties);
    });
    it('MM-T3825_2 - M4A', () => {
        const properties = {
            filePath: 'mm_file_testing/Audio/M4A.m4a',
            fileName: 'M4A.m4a',
            shouldPreview: false,
        };
        testAudioFile(properties);
    });
    it('MM-T3825_3 - AAC', () => {
        const properties = {
            filePath: 'mm_file_testing/Audio/AAC.aac',
            fileName: 'AAC.aac',
            mimeType: 'audio/aac',
            shouldPreview: false,
        };
        testAudioFile(properties);
    });
    it('MM-T3825_4 - FLAC', () => {
        const properties = {
            filePath: 'mm_file_testing/Audio/FLAC.flac',
            fileName: 'FLAC.flac',
            shouldPreview: false,
        };
        testAudioFile(properties);
    });
    it('MM-T3825_5 - OGG', () => {
        const properties = {
            filePath: 'mm_file_testing/Audio/OGG.ogg',
            fileName: 'OGG.ogg',
            mimeType: 'audio/ogg',
            shouldPreview: true,
        };
        testAudioFile(properties);
    });
    it('MM-T3825_6 - WAV', () => {
        const properties = {
            filePath: 'mm_file_testing/Audio/WAV.wav',
            fileName: 'WAV.wav',
            mimeType: 'audio/wav',
            shouldPreview: true,
        };
        testAudioFile(properties);
    });
    it('MM-T3825_7 - WMA', () => {
        const properties = {
            filePath: 'mm_file_testing/Audio/WMA.wma',
            fileName: 'WMA.wma',
            shouldPreview: false,
        };
        testAudioFile(properties);
    });
});
function testAudioFile(properties) {
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
    cy.get('.file-preview-modal__file-name').should('have.text', fileName);
    cy.get('@filePreviewModal').uiGetDownloadFilePreviewModal().then((downloadLink) => {
        cy.wrap(downloadLink).parent().should('have.attr', 'download', fileName).then((link) => {
            const fileAttachmentURL = link.attr('href');
            downloadAttachmentAndVerifyItsProperties(fileAttachmentURL, fileName, 'attachment');
        });
    });
    cy.uiCloseFilePreviewModal();
}