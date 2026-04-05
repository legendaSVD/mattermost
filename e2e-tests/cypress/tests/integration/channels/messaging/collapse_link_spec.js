describe('Messaging', () => {
    let testUser;
    let offTopicUrl;
    before(() => {
        cy.apiUpdateConfig({
            ServiceSettings: {
                EnableLinkPreviews: true,
            },
        });
        cy.apiInitSetup({loginAfter: true}).then(({offTopicUrl: url, user}) => {
            testUser = user;
            offTopicUrl = url;
            cy.apiSaveLinkPreviewsPreference('true');
            cy.apiSaveCollapsePreviewsPreference('false');
            cy.visit(offTopicUrl);
        });
    });
    it('MM-T199 Link preview - Removing it from my view removes it from other user\'s view', () => {
        const message = 'https://www.bbc.com/news/uk-wales-45142614';
        cy.postMessage(message);
        cy.getLastPostId().then((postId) => {
            cy.get(`#${postId}_message`).find('.PostAttachmentOpenGraph').should('exist');
            cy.get(`#${postId}_message`).find('.PostAttachmentOpenGraph__image figure').should('exist');
            cy.apiAdminLogin();
            cy.visit(offTopicUrl);
            cy.get(`#${postId}_message`).find('.PostAttachmentOpenGraph').should('exist');
            cy.get(`#${postId}_message`).find('.PostAttachmentOpenGraph__image figure').should('exist');
            cy.apiLogin(testUser);
            cy.visit(offTopicUrl);
            cy.get(`#${postId}_message`).find('.preview-toggle').click({force: true});
            cy.get(`#${postId}_message`).find('.PostAttachmentOpenGraph').should('exist');
            cy.get(`#${postId}_message`).find('.PostAttachmentOpenGraph__image figure').should('not.exist');
            cy.apiAdminLogin();
            cy.visit(offTopicUrl);
            cy.get(`#${postId}_message`).find('.PostAttachmentOpenGraph').should('exist');
            cy.get(`#${postId}_message`).find('.PostAttachmentOpenGraph__image figure').should('exist');
            cy.apiLogin(testUser);
            cy.visit(offTopicUrl);
            cy.get(`#${postId}_message`).within(() => {
                cy.findByTestId('removeLinkPreviewButton').click({force: true});
            });
            cy.get(`#${postId}_message`).find('.PostAttachmentOpenGraph').should('not.exist');
            cy.get(`#${postId}_message`).find('.PostAttachmentOpenGraph__image figure').should('not.exist');
            cy.apiAdminLogin();
            cy.visit(offTopicUrl);
            cy.get(`#${postId}_message`).find('.PostAttachmentOpenGraph').should('not.exist');
            cy.get(`#${postId}_message`).find('.PostAttachmentOpenGraph__image figure').should('not.exist');
        });
    });
});