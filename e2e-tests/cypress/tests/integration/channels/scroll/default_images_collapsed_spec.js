describe('Scroll', () => {
    before(() => {
        cy.apiInitSetup({loginAfter: true}).then(({offTopicUrl}) => {
            cy.apiSaveCollapsePreviewsPreference('true');
            cy.visit(offTopicUrl);
            Cypress._.times(10, (index) => cy.postMessage(index));
        });
    });
    it('MM-T2370 Default images to collapsed', () => {
        const filename = 'huge-image.jpg';
        cy.get('#advancedTextEditorCell').find('#fileUploadInput').attachFile(filename);
        cy.get('.post-image').should('be.visible');
        cy.uiGetPostTextBox().clear().type('{enter}');
        cy.uiGetFileThumbnail(filename).should('not.exist');
        cy.getLastPost().then((lastPost) => {
            cy.wrap(parseInt(lastPost[0].clientHeight, 10)).as('lastPostHeight');
        });
        cy.reload();
        cy.getLastPost().then((lastPost) => {
            cy.get('@lastPostHeight').then((lastPostHeight) => {
                expect(parseInt(lastPost[0].clientHeight, 10)).to.equal(lastPostHeight);
            });
        });
        cy.uiGetFileThumbnail(filename).should('not.exist');
        cy.apiSaveCollapsePreviewsPreference('false');
        cy.reload();
        cy.uiGetFileThumbnail(filename).should('be.visible');
    });
});