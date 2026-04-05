describe('Image Link Preview', () => {
    let offTopicUrl;
    before(() => {
        cy.apiUpdateConfig({
            ServiceSettings: {
                EnableLinkPreviews: true,
            },
        });
        cy.apiInitSetup({loginAfter: true}).then((out) => {
            offTopicUrl = out.offTopicUrl;
            cy.apiSaveLinkPreviewsPreference('true');
            cy.visit(offTopicUrl);
        });
    });
    beforeEach(() => {
        cy.apiSaveCollapsePreviewsPreference('false');
    });
    it('MM-T332 Image link preview - Bitly links for images and YouTube -- KNOWN ISSUE: MM-40448', () => {
        const links = ['https://bit.ly/2NlYsOr', 'https://bit.ly/2wqEbjw'];
        links.forEach((link) => {
            cy.postMessage(link);
            cy.getLastPostId().then((postId) => {
                cy.get(`#post_${postId}`).should('be.visible').within(() => {
                    cy.findByLabelText('Toggle Embed Visibility').
                        should('be.visible').and('have.attr', 'data-expanded', 'true');
                    cy.findByLabelText('file thumbnail').should('be.visible');
                });
                cy.get(`#post_${postId}`).findByLabelText('Toggle Embed Visibility').
                    click().
                    should('have.attr', 'data-expanded', 'false');
                cy.get(`#post_${postId}`).findByLabelText('file thumbnail').should('not.exist');
                cy.get(`#post_${postId}`).findByLabelText('Toggle Embed Visibility').
                    click().
                    should('have.attr', 'data-expanded', 'true');
                cy.get(`#post_${postId}`).findByLabelText('file thumbnail').should('be.visible');
            });
        });
    });
});