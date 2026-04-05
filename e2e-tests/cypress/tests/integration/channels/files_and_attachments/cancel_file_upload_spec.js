describe('Upload Files', () => {
    before(() => {
        cy.apiInitSetup({loginAfter: true}).then(({offTopicUrl}) => {
            cy.visit(offTopicUrl);
        });
    });
    it('MM-T307 Cancel a file upload', () => {
        const hugeImage = 'huge-image.jpg';
        cy.intercept('POST', '/api/v4/files', {
            body: {client_ids: [], file_infos: []},
        });
        cy.get('#advancedTextEditorCell').find('#fileUploadInput').attachFile(hugeImage);
        cy.get('.file-preview__container').should('be.visible').within(() => {
            cy.get('.post-image__thumbnail').should('be.visible');
            cy.findByText(hugeImage).should('be.visible');
            cy.findByText('Processing...').should('be.visible');
        });
        cy.get('.file-preview__remove > .icon').click();
        cy.get('.post-image').should('not.exist');
        cy.findByLabelText('file thumbnail').should('not.exist');
    });
});