describe('Messaging', () => {
    before(() => {
        cy.apiInitSetup({loginAfter: true}).then(({team, channel}) => {
            cy.visit(`/${team.name}/channels/${channel.name}`);
        });
    });
    it('MM-T187 Inline markdown images open preview window', () => {
        cy.postMessage('Hello ![test image](https://raw.githubusercontent.com/mattermost/mattermost/master/e2e-tests/cypress/tests/fixtures/image-small-height.png)');
        cy.uiWaitUntilMessagePostedIncludes('Hello');
        cy.get('.markdown-inline-img__container').should('be.visible');
        cy.get('.file-preview__button').trigger('mouseover').click();
        cy.findByTestId('imagePreview').should('be.visible');
    });
});