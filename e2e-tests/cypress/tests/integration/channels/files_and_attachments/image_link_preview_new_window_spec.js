describe('Image Link Preview', () => {
    before(() => {
        cy.apiUpdateConfig({
            ServiceSettings: {
                EnableLinkPreviews: true,
            },
        });
        cy.apiInitSetup({loginAfter: true}).then(({channelUrl}) => {
            cy.apiSaveLinkPreviewsPreference('true');
            cy.apiSaveCollapsePreviewsPreference('false');
            cy.visit(channelUrl);
        });
    });
    it('MM-T329 Image link preview', () => {
        const link = 'https://raw.githubusercontent.com/mattermost/mattermost/master/e2e-tests/cypress/tests/fixtures/image-small-height.png';
        const baseUrl = Cypress.config('baseUrl');
        const encodedIconUrl = encodeURIComponent(link);
        cy.postMessage(link);
        const expectedSrc = `${baseUrl}/api/v4/image?url=${encodedIconUrl}`;
        cy.uiGetPostEmbedContainer().
            find('img').
            should('have.attr', 'src', expectedSrc).
            click();
        cy.uiGetFilePreviewModal().as('filePreviewModal');
        cy.get('@filePreviewModal').findByTestId('imagePreview').should('have.attr', 'src', expectedSrc);
        cy.get('@filePreviewModal').uiGetContentFilePreviewModal().find('img').should((img) => {
            expect(img.height()).to.be.closeTo(25, 2);
            expect(img.width()).to.be.closeTo(340, 2);
        });
        cy.get('@filePreviewModal').uiGetPublicLink({exist: false});
        cy.uiCloseFilePreviewModal();
        cy.uiGetFilePreviewModal({exist: false});
        cy.uiGetPostBody().find('.markdown__link').then((el) => {
            const href = el.prop('href');
            cy.request(href).then((res) => {
                expect(res.status).equal(200);
            });
            expect(link).to.equal(href);
        });
    });
});