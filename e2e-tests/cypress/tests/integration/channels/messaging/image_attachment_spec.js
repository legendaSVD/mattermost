describe('Image attachment', () => {
    before(() => {
        cy.apiInitSetup({loginAfter: true}).then(({offTopicUrl}) => {
            cy.visit(offTopicUrl);
        });
    });
    it('Image smaller than 48px in both width and height', () => {
        const filename = 'small-image.png';
        cy.get('#fileUploadInput').attachFile(filename);
        verifyImageInPostFooter();
        cy.postMessage('Image upload');
        verifyImageInPostFooter(false);
        verifyFileThumbnail({
            filename,
            actualImage: {height: 24, width: 24},
            container: {height: 45, width: 45},
        });
    });
    it('Image with height smaller than 48px', () => {
        const filename = 'image-small-height.png';
        cy.get('#fileUploadInput').attachFile(filename);
        verifyImageInPostFooter();
        cy.postMessage('Image upload');
        verifyImageInPostFooter(false);
        verifyFileThumbnail({
            filename,
            actualImage: {height: 24, width: 340},
            container: {height: 45, width: 339},
        });
    });
    it('Image with width smaller than 48px', () => {
        const filename = 'image-small-width.png';
        cy.get('#fileUploadInput').attachFile(filename);
        verifyImageInPostFooter();
        cy.postMessage('Image upload');
        verifyImageInPostFooter(false);
        verifyFileThumbnail({
            filename,
            actualImage: {height: 350, width: 21},
            container: {height: 348, width: 46},
        });
    });
    it('Image with width and height bigger than 48px', () => {
        const filename = 'MM-logo-horizontal.png';
        cy.get('#fileUploadInput').attachFile(filename);
        verifyImageInPostFooter();
        cy.postMessage('Image upload');
        verifyImageInPostFooter(false);
        verifyFileThumbnail({
            filename,
            actualImage: {height: 144, width: 906},
        });
    });
    it('opens image preview window when image is clicked', () => {
        const filename = 'MM-logo-horizontal.png';
        cy.get('#fileUploadInput').attachFile(filename);
        verifyImageInPostFooter();
        cy.postMessage('Image upload');
        verifyImageInPostFooter(false);
        verifyFileThumbnail({
            filename,
            actualImage: {height: 144, width: 906},
            clickPreview: () => cy.uiGetFileThumbnail(filename).click(),
        });
        cy.uiGetFilePreviewModal();
        cy.uiCloseFilePreviewModal();
    });
    it('opens image preview window when small image is clicked', () => {
        const filename = 'small-image.png';
        cy.get('#fileUploadInput').attachFile(filename);
        verifyImageInPostFooter();
        cy.postMessage('Image upload');
        verifyImageInPostFooter(false);
        verifyFileThumbnail({
            filename,
            actualImage: {height: 24, width: 24},
            container: {height: 45, width: 45},
            clickPreview: () => cy.uiGetFileThumbnail(filename).click(),
        });
        cy.uiGetFilePreviewModal();
    });
});
function verifyImageInPostFooter(verifyExistence = true) {
    cy.get('#advancedTextEditorCell').find('.file-preview').should(verifyExistence ? 'be.visible' : 'not.exist');
}
function verifyFileThumbnail({filename, actualImage = {}, container = {}, clickPreview}) {
    cy.getLastPostId().then((postId) => {
        cy.get(`#${postId}_message`).within(() => {
            cy.uiGetFileThumbnail(filename).
                should((img) => {
                    expect(img.height()).to.be.closeTo(actualImage.height, 2.0);
                    expect(img.width()).to.be.closeTo(actualImage.width, 2.0);
                }).
                parent().
                should((img) => {
                    if (container.width || container.height) {
                        expect(img.height()).to.be.closeTo(container.height, 2.0);
                        expect(img.width()).to.be.closeTo(container.width, 2.0);
                    }
                });
            if (clickPreview) {
                clickPreview();
            }
        });
    });
}