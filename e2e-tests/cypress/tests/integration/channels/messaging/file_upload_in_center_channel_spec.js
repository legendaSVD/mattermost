describe('Messaging', () => {
    before(() => {
        cy.apiInitSetup({loginAfter: true}).then(({offTopicUrl}) => {
            cy.visit(offTopicUrl);
        });
    });
    it('MM-T4861 Show single image thumbnails in standard mode', () => {
        cy.apiSaveMessageDisplayPreference('clean');
        const IMAGE_NAME = 'huge-image.jpg';
        cy.get('#fileUploadInput').attachFile(IMAGE_NAME);
        cy.uiWaitForFileUploadPreview();
        const IMAGE_WITH_POST_TEXT = `image in compact display setting ${Date.now()}`;
        cy.postMessage(IMAGE_WITH_POST_TEXT);
        cy.getLastPostId().then((lastPostId) => {
            cy.get(`#${lastPostId}_message`).should('exist').within(() => {
                cy.findByText(IMAGE_WITH_POST_TEXT).should('exist');
                cy.findByText(IMAGE_NAME).should('not.exist');
                cy.findByLabelText(`file thumbnail ${IMAGE_NAME}`);
                cy.findByLabelText('Toggle Embed Visibility').should('exist');
                cy.get('img').should('exist').and('have.css', 'max-height', '350px');
            });
        });
    });
});