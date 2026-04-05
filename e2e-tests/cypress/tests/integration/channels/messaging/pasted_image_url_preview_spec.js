describe('Image URL Preview', () => {
    before(() => {
        cy.apiInitSetup({loginAfter: true}).then(({team, channel}) => {
            cy.visit(`/${team.name}/channels/${channel.name}`);
        });
    });
    it('MM-T1 - Image URL in markdown format opens correctly in preview modal', () => {
        const imageUrl = 'https://raw.githubusercontent.com/mattermost/mattermost/master/e2e-tests/cypress/tests/fixtures/image-small-height.png';
        cy.postMessage('This is a test message with an image.![test image](' + imageUrl + ') This text should appear after the image.');
        cy.uiWaitUntilMessagePostedIncludes('This is a test message with an image');
        cy.get('.markdown-inline-img').should('be.visible');
        cy.getLastPostId().then((postId) => {
            cy.get(`#postMessageText_${postId}`).should('contain', 'This text should appear after the image');
        });
        cy.getLastPostId().then((postId) => {
            cy.get(`#post_${postId}`).find('.file-preview__button').click();
        });
        cy.findByTestId('imagePreview').should('be.visible').and('have.class', 'image_preview__image').and('have.attr', 'alt', 'preview url image').and('have.attr', 'src').and('include', 'image-small-height.png');
        cy.uiCloseFilePreviewModal();
    });
    it('MM-T2 - Image URL without file extension in markdown format opens correctly in preview modal', () => {
        const imageUrl = 'https://hub.mattermost.com/files/sdrkars9kfdrxmyj4gcz6xk9de/public?h=dM-SC6JuRu0DarFyFPEMG_-io9gi7VY2qNV4Z59TmsM';
        cy.postMessage('This is a test message with an image without extension.![test image](' + imageUrl + ') This text should appear after the image.');
        cy.uiWaitUntilMessagePostedIncludes('This is a test message with an image without extension');
        cy.get('.markdown-inline-img').should('be.visible');
        cy.getLastPostId().then((postId) => {
            cy.get(`#postMessageText_${postId}`).should('contain', 'This text should appear after the image');
        });
        cy.getLastPostId().then((postId) => {
            cy.get(`#post_${postId}`).find('.file-preview__button').click();
        });
        cy.findByTestId('imagePreview').should('be.visible').and('have.class', 'image_preview__image').and('have.attr', 'alt', 'preview url image').and('have.attr', 'src').and('include', 'public');
        cy.uiCloseFilePreviewModal();
    });
    it('MM-T3 - Proxied image URL in markdown format opens correctly in preview modal', () => {
        const originalImageUrl = 'https://raw.githubusercontent.com/mattermost/mattermost/master/e2e-tests/cypress/tests/fixtures/image-small-height.png';
        const proxiedImageUrl = Cypress.config('baseUrl') + '/api/v4/image?url=' + encodeURIComponent(originalImageUrl);
        cy.postMessage('This is a test message with a proxied image URL.![test image](' + proxiedImageUrl + ') This text should appear after the image.');
        cy.uiWaitUntilMessagePostedIncludes('This is a test message with a proxied image URL');
        cy.get('.markdown-inline-img').should('be.visible');
        cy.getLastPostId().then((postId) => {
            cy.get(`#postMessageText_${postId}`).should('contain', 'This text should appear after the image');
        });
        cy.getLastPostId().then((postId) => {
            cy.get(`#post_${postId}`).find('.file-preview__button').click();
        });
        cy.findByTestId('imagePreview').should('be.visible').and('have.class', 'image_preview__image').and('have.attr', 'alt', 'preview url image').and('have.attr', 'src').and('include', proxiedImageUrl);
        cy.uiCloseFilePreviewModal();
    });
});