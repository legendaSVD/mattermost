describe('Paste Image', () => {
    before(() => {
        cy.apiUpdateConfig({
            ServiceSettings: {
                EnableLinkPreviews: true,
            },
        });
        cy.apiInitSetup({loginAfter: true}).then(({offTopicUrl}) => {
            cy.visit(offTopicUrl);
        });
    });
    it('MM-T2263 - Paste image in message box and post', () => {
        const filename = 'mattermost-icon.png';
        cy.fixture(filename).then((img) => {
            const blob = Cypress.Blob.base64StringToBlob(img, 'image/png');
            cy.uiGetPostTextBox().trigger('paste', {clipboardData: {
                items: [{
                    name: filename,
                    kind: 'file',
                    type: 'image/png',
                    getAsFile: () => {
                        return blob;
                    },
                }],
                types: [],
                getData: () => {},
            }});
            cy.uiWaitForFileUploadPreview();
        });
        cy.uiGetFileUploadPreview().should('be.visible').within(() => {
            cy.get('.post-image__type').should('contain.text', 'PNG');
            cy.get('.post-image__size').should('contain.text', '13KB');
            cy.get('.post-image__thumbnail > .post-image').should('exist');
        });
        cy.postMessage('hello');
        cy.uiGetPostBody().
            find('.file-view--single').
            find('img').
            should(maintainAspectRatio);
        cy.clickPostCommentIcon();
        cy.getLastPostId().then((id) => {
            cy.get(`#rhsPost_${id}`).within(() => {
                cy.get('.file-view--single').
                    find('img').
                    should(maintainAspectRatio);
            });
        });
    });
});
function maintainAspectRatio(img) {
    const aspectRatio = 1;
    expect(img.width() / img.height()).to.be.closeTo(aspectRatio, 0.01);
}