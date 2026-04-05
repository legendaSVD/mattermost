import * as TIMEOUTS from '../../../fixtures/timeouts';
describe('Messaging', () => {
    before(() => {
        cy.apiInitSetup({loginAfter: true}).then(({offTopicUrl}) => {
            cy.visit(offTopicUrl);
        });
    });
    it('MM-T105 Long post with multiple attachments', () => {
        postAttachments();
        cy.get('#showMoreButton').scrollIntoView().should('be.visible').and('have.text', 'Show more');
        cy.getLastPostId().then((postID) => {
            cy.get(`#${postID}_message`).findByTestId('fileAttachmentList').children().should('have.length', '4');
            [...Array(4)].forEach((value, index) => {
                cy.get(`#${postID}_message`).findByTestId('fileAttachmentList').children().eq(index).
                    find('.post-image__name').contains('small-image.png').should('exist');
            });
        });
        postAttachments();
        cy.getLastPostId().then((postId) => {
            cy.get(`#${postId}_message`).within(() => {
                cy.uiOpenFilePreviewModal();
            });
            cy.uiGetFilePreviewModal();
            cy.uiGetHeaderFilePreviewModal().contains('1 of 4');
            for (let index = 2; index <= 4; index++) {
                cy.get('#previewArrowRight').should('be.visible').click();
                cy.uiGetHeaderFilePreviewModal().contains(`${index} of 4`);
            }
            cy.uiCloseFilePreviewModal();
        });
    });
});
function verifyImageInPostFooter(verifyExistence = true) {
    cy.get('#advancedTextEditorCell').find('.file-preview').should(verifyExistence ? 'be.visible' : 'not.exist').wait(TIMEOUTS.THREE_SEC);
}
function postAttachments() {
    [...Array(4)].forEach(() => {
        cy.get('#fileUploadInput').attachFile('small-image.png');
    });
    verifyImageInPostFooter();
    cy.fixture('long_text_post.txt', 'utf-8').then((text) => {
        cy.uiGetPostTextBox().then((textbox) => {
            textbox.val(text);
        }).type(' {backspace}{enter}');
    });
}