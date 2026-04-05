import * as TIMEOUTS from '../../../fixtures/timeouts';
import {interceptFileUpload, waitUntilUploadComplete} from './helpers';
describe('Channel files', () => {
    const wordFile = 'word-file.doc';
    const wordxFile = 'wordx-file.docx';
    const imageFile = 'jpg-image-file.jpg';
    before(() => {
        cy.apiInitSetup({loginAfter: true}).then(({offTopicUrl}) => {
            cy.visit(offTopicUrl);
            interceptFileUpload();
        });
    });
    it('MM-T4418 Channel files search', () => {
        cy.uiGetLhsSection('DIRECT MESSAGES').should('be.visible');
        [wordFile, wordxFile, imageFile].forEach((file) => {
            attachFile(file);
        });
        cy.uiGetChannelFileButton().click();
        verifySearchResult([imageFile, wordxFile, wordFile]);
        [
            {option: 'Documents', returnedFiles: [wordxFile, wordFile]},
            {option: 'Spreadsheets', returnedFiles: null},
            {option: 'Presentations', returnedFiles: null},
            {option: 'Code', returnedFiles: null},
            {option: 'Images', returnedFiles: [imageFile]},
            {option: 'Audio', returnedFiles: null},
            {option: 'Videos', returnedFiles: null},
        ].forEach(({option, returnedFiles}) => {
            filterSearchBy(option, returnedFiles);
        });
    });
});
function attachFile(file) {
    cy.get('#advancedTextEditorCell').
        find('#fileUploadInput').
        attachFile(file);
    waitUntilUploadComplete();
    cy.get('.post-image__thumbnail').should('be.visible');
    cy.uiGetPostTextBox().clear().type('{enter}');
}
function filterSearchBy(option, returnedFiles) {
    cy.uiOpenFileFilterMenu(option);
    cy.wait(TIMEOUTS.ONE_SEC);
    verifySearchResult(returnedFiles);
}
function verifySearchResult(files) {
    if (files) {
        cy.get('#search-items-container').should('be.visible').within(() => {
            cy.get('.fileDataName').each((el, i) => {
                cy.wrap(el).should('have.text', files[i]);
            });
        });
    } else {
        cy.get('#search-items-container').findByText('No files found').should('be.visible');
    }
}