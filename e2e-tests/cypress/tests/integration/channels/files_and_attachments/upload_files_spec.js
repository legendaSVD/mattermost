import * as TIMEOUTS from '../../../fixtures/timeouts';
import {
    downloadAttachmentAndVerifyItsProperties,
    interceptFileUpload,
    waitUntilUploadComplete,
} from './helpers';
describe('Upload Files', () => {
    let channelUrl;
    let channelId;
    let testUser;
    beforeEach(() => {
        cy.apiAdminLogin();
        cy.apiInitSetup().then((out) => {
            channelUrl = out.channelUrl;
            channelId = out.channel.id;
            testUser = out.user;
            cy.visit(channelUrl);
            interceptFileUpload();
        });
    });
    it('MM-T336 Image thumbnail - expanded RHS', () => {
        const filename = 'huge-image.jpg';
        const originalWidth = 1920;
        const originalHeight = 1280;
        const aspectRatio = originalWidth / originalHeight;
        cy.get('#advancedTextEditorCell').find('#fileUploadInput').attachFile(filename);
        waitUntilUploadComplete();
        cy.uiGetPostTextBox().clear().type('{enter}');
        cy.clickPostCommentIcon();
        cy.uiGetRHS().within(() => {
            cy.uiGetFileThumbnail(filename).should((img) => {
                expect(img.width() / img.height()).to.be.closeTo(aspectRatio, 1);
            });
            cy.uiExpandRHS();
        });
        cy.uiGetRHS().isExpanded().within(() => {
            cy.uiGetFileThumbnail(filename).should((img) => {
                expect(img.width() / img.height()).to.be.closeTo(aspectRatio, 1);
            });
        });
        cy.uiCloseRHS();
    });
    it('MM-T340 Download - File name link on thumbnail', () => {
        const attachmentFilesList = [
            {
                filename: 'word-file.doc',
                extensions: 'DOC',
                type: 'document',
            },
            {
                filename: 'wordx-file.docx',
                extensions: 'DOCX',
                type: 'document',
            },
            {
                filename: 'powerpoint-file.ppt',
                extensions: 'PPT',
                type: 'document',
            },
            {
                filename: 'powerpointx-file.pptx',
                extensions: 'PPTX',
                type: 'document',
            },
            {
                filename: 'jpg-image-file.jpg',
                extensions: 'JPG',
                type: 'image',
            },
        ];
        attachmentFilesList.forEach((file) => {
            cy.get('#fileUploadInput').attachFile(file.filename);
            waitUntilUploadComplete();
            cy.postMessage('hello');
            cy.uiWaitUntilMessagePostedIncludes('hello');
            cy.uiGetPostBody().within(() => {
                if (file.type === 'document') {
                    cy.findByLabelText('download').then((fileAttachment) => {
                        expect(fileAttachment.attr('download')).to.equal(file.filename);
                        const fileAttachmentURL = fileAttachment.attr('href');
                        downloadAttachmentAndVerifyItsProperties(fileAttachmentURL, file.filename, 'attachment');
                    });
                    cy.findByText(file.filename);
                    cy.findByText(file.extensions).click();
                } else if (file.type === 'image') {
                    cy.uiGetFileThumbnail(file.filename).click();
                }
            });
            cy.uiGetFilePreviewModal().as('filePreviewModal');
            cy.get('@filePreviewModal').uiGetDownloadFilePreviewModal().then((downloadLink) => {
                cy.wrap(downloadLink).parent().should('have.attr', 'download', file.filename).then((link) => {
                    const fileAttachmentURL = link.attr('href');
                    downloadAttachmentAndVerifyItsProperties(fileAttachmentURL, file.filename, 'attachment');
                });
            });
            cy.uiCloseFilePreviewModal();
        });
    });
    it('MM-T341 Download link on preview - Image file (non SVG)', () => {
        const imageFilenames = [
            'bmp-image-file.bmp',
            'png-image-file.png',
            'jpg-image-file.jpg',
            'gif-image-file.gif',
            'tiff-image-file.tif',
        ];
        imageFilenames.forEach((filename) => {
            cy.get('#advancedTextEditorCell').find('#fileUploadInput').attachFile(filename);
            waitUntilUploadComplete();
            cy.postMessage('hello');
            cy.uiWaitUntilMessagePostedIncludes('hello');
            cy.uiGetFileThumbnail(filename).click();
            cy.uiGetFilePreviewModal().as('filePreviewModal');
            cy.get('@filePreviewModal').uiGetDownloadFilePreviewModal().then((downloadLink) => {
                cy.wrap(downloadLink).parent().should('have.attr', 'download', filename).then((link) => {
                    const fileAttachmentURL = link.attr('href');
                    downloadAttachmentAndVerifyItsProperties(fileAttachmentURL, filename, 'attachment');
                });
            });
            cy.uiCloseFilePreviewModal();
        });
    });
    it('MM-T12 Loading indicator when posting images', () => {
        const filename = 'huge-image.jpg';
        cy.get('#advancedTextEditorCell').find('#fileUploadInput').attachFile(filename);
        waitUntilUploadComplete();
        cy.uiGetPostTextBox().clear().type('{enter}');
        cy.apiLogin(testUser);
        cy.reload();
        cy.get('.image-container').should('be.visible');
        Cypress._.times(5, () => {
            cy.postMessageAs({
                sender: testUser,
                message: 'message',
                channelId,
            });
            cy.get('.image-container').should('be.visible').find('.image-loading__container').should('not.exist');
            cy.wait(TIMEOUTS.HALF_SEC);
        });
    });
    it('MM-T337 CTRL/CMD+U - Five files on one message, thumbnails while uploading', () => {
        cy.visit(channelUrl);
        const filename = 'huge-image.jpg';
        Cypress._.times(5, () => {
            cy.get('#fileUploadInput').attachFile(filename);
            waitUntilUploadComplete();
        });
        for (let i = 1; i < 4; i++) {
            cy.get(`:nth-child(${i}) > .post-image__thumbnail > .post-image`).should('be.visible');
        }
        cy.get(':nth-child(5) > .post-image__thumbnail > .post-image').should('not.be.visible');
        cy.get('.file-preview__container').scrollTo('right');
        for (let i = 1; i < 3; i++) {
            cy.get(`:nth-child(${i}) > .post-image__thumbnail > .post-image`).should('not.be.visible');
        }
        cy.get(':nth-child(5) > .post-image__thumbnail > .post-image').should('be.visible');
        cy.postMessage('test');
        cy.findByTestId('fileAttachmentList').find('.post-image').should('have.length', 5);
    });
    it('MM-T338 Image Attachment Upload in Mobile View', () => {
        cy.viewport('iphone-6');
        cy.findByLabelText('Attachment Icon').should('be.visible').and('have.css', 'cursor', 'pointer');
        const imageFilename = 'jpg-image-file.jpg';
        const imageType = 'JPG';
        cy.get('#fileUploadInput').attachFile(imageFilename);
        waitUntilUploadComplete();
        cy.get('#advancedTextEditorCell').should('be.visible').within(() => {
            cy.findByText(imageFilename).should('be.visible');
            cy.findByText(imageType).should('be.visible');
            cy.get('.post-image.normal').then((imageDiv) => {
                const imageURL = imageDiv.css('background-image').split('"')[1];
                downloadAttachmentAndVerifyItsProperties(imageURL, imageFilename, 'inline');
            });
        });
        cy.uiGetPostTextBox().clear().type('{enter}');
        cy.uiGetFileThumbnail(imageFilename).should('have.attr', 'src').then((src) => {
            downloadAttachmentAndVerifyItsProperties(src, imageFilename, 'inline');
        });
    });
    it('MM-T2265 Multiple File Upload - 5 is successful (image, video, code, pdf, audio, other)', () => {
        const attachmentFilesList = [
            {
                filename: 'word-file.doc',
                extensions: 'DOC',
                type: 'document',
            },
            {
                filename: 'wordx-file.docx',
                extensions: 'DOCX',
                type: 'document',
            },
            {
                filename: 'powerpoint-file.ppt',
                extensions: 'PPT',
                type: 'document',
            },
            {
                filename: 'powerpointx-file.pptx',
                extensions: 'PPTX',
                type: 'document',
            },
            {
                filename: 'jpg-image-file.jpg',
                extensions: 'JPG',
                type: 'image',
            },
        ];
        const minimumSeparation = 5;
        cy.visit(channelUrl);
        cy.uiGetPostTextBox();
        Cypress._.forEach(attachmentFilesList, ({filename}) => {
            cy.get('#fileUploadInput').attachFile(filename);
            waitUntilUploadComplete();
        });
        cy.wait(TIMEOUTS.THREE_SEC);
        cy.postMessage('test');
        cy.findByTestId('fileAttachmentList').within(() => {
            for (let i = 1; i < 5; i++) {
                cy.get(`:nth-child(${i}) > .post-image__details`).then((firstAttachment) => {
                    cy.get(`:nth-child(${i + 1}) > .post-image__thumbnail`).then((secondAttachment) => {
                        expect(firstAttachment[0].getBoundingClientRect().right + minimumSeparation < secondAttachment[0].getBoundingClientRect().left ||
                        firstAttachment[0].getBoundingClientRect().bottom + minimumSeparation < secondAttachment[0].getBoundingClientRect().top).to.be.true;
                    });
                });
            }
        });
        cy.uiOpenFilePreviewModal();
        cy.uiGetFilePreviewModal().as('filePreviewModal');
        cy.get('@filePreviewModal').uiGetHeaderFilePreviewModal().within(() => {
            cy.findByText(attachmentFilesList[0].filename);
        });
        cy.get('@filePreviewModal').uiGetArrowRightFilePreviewModal().click();
        cy.get('@filePreviewModal').uiGetHeaderFilePreviewModal().within(() => {
            cy.findByText(attachmentFilesList[1].filename);
        });
        cy.get('@filePreviewModal').uiGetArrowLeftFilePreviewModal().click();
        cy.get('@filePreviewModal').uiGetHeaderFilePreviewModal().within(() => {
            cy.findByText(attachmentFilesList[0].filename);
        });
    });
    it('MM-T2261 Upload SVG and post', () => {
        const filename = 'svg.svg';
        const aspectRatio = 1;
        cy.visit(channelUrl);
        cy.uiGetPostTextBox();
        cy.get('#advancedTextEditorCell').find('#fileUploadInput').attachFile(filename);
        waitUntilUploadComplete();
        cy.get('#create_post').find('.file-preview').within(() => {
            cy.get('.post-image__name').should('contain.text', filename);
            cy.get('.post-image__type').should('contain.text', 'SVG');
            cy.get('.post-image__size').should('contain.text', '6KB');
            cy.get('.post-image__thumbnail > img').should('exist');
        });
        cy.postMessage('hello');
        cy.uiWaitUntilMessagePostedIncludes('hello');
        cy.uiGetFileThumbnail(filename).click();
        cy.uiGetFilePreviewModal().as('filePreviewModal');
        cy.get('@filePreviewModal').uiGetContentFilePreviewModal().find('img').should((img) => {
            expect(img.width() / img.height()).to.be.closeTo(aspectRatio, 1);
        });
        cy.get('@filePreviewModal').uiGetDownloadFilePreviewModal().then((downloadLink) => {
            cy.wrap(downloadLink).parent().should('have.attr', 'download', filename).then((link) => {
                const fileAttachmentURL = link.attr('href');
                downloadAttachmentAndVerifyItsProperties(fileAttachmentURL, filename, 'attachment');
            });
        });
        cy.uiCloseFilePreviewModal();
    });
});