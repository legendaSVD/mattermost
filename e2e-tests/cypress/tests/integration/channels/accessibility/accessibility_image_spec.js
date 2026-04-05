describe('Verify Accessibility Support in Different Images', () => {
    let otherUser;
    before(() => {
        cy.apiInitSetup().then(({offTopicUrl, user}) => {
            otherUser = user;
            cy.visit(offTopicUrl);
        });
    });
    it('MM-T1508 Accessibility support in different images', () => {
        cy.get('#userAccountMenuButton').within(() => {
            cy.findByAltText('user profile image').should('be.visible');
        });
        cy.get('#fileUploadInput').attachFile('small-image.png');
        cy.postMessage('Image upload');
        cy.getLastPostId().then((postId) => {
            cy.get(`#${postId}_message`).within(() => {
                cy.get('img').should('be.visible').should('have.attr', 'aria-label', 'file thumbnail small-image.png');
            });
        });
        cy.getCurrentChannelId().then((channelId) => {
            const message = `hello from ${otherUser.username}: ${Date.now()}`;
            cy.postMessageAs({sender: otherUser, message, channelId});
        });
        cy.getLastPostId().then((postId) => {
            cy.get(`#post_${postId}`).within(() => {
                cy.get('.status-wrapper').click();
            });
            cy.get('.user-profile-popover').within(() => {
                cy.get('.Avatar').should('have.attr', 'alt', `${otherUser.username} profile image`);
            });
        });
        cy.get('body').click();
        cy.uiOpenSettingsModal('Display').within(() => {
            cy.get('#displayButton').click();
            cy.get('#displaySettingsTitle').should('exist');
            cy.get('#themeTitle').scrollIntoView().should('be.visible');
            cy.get('#themeEdit').click();
            cy.get('#displaySettings').within(() => {
                cy.get('.appearance-section>div').children().each(($el) => {
                    cy.wrap($el).get('#denim-theme-icon').should('have.text', 'Denim theme icon');
                });
            });
        });
    });
});