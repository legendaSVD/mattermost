describe('Show GIF images properly', () => {
    let offtopiclink;
    before(() => {
        cy.apiUpdateConfig({
            ServiceSettings: {
                EnableLinkPreviews: true,
            },
        });
        cy.apiInitSetup({loginAfter: true}).then(({team}) => {
            offtopiclink = `/${team.name}/channels/off-topic`;
            cy.visit(offtopiclink);
        });
    });
    it('MM-T3318 Posting GIFs', () => {
        cy.get('#sidebarItem_off-topic').click({force: true});
        cy.url().should('include', offtopiclink);
        cy.postMessage('https://media.tenor.com/yCFHzEvKa9MAAAAi/hello.gif');
        cy.getLastPostId().as('postId').then((postId) => {
            cy.get(`#post_${postId}`).find('.attachment__image').should('have.css', 'width', '189px');
        });
        cy.postMessage('https://media.giphy.com/media/XIqCQx02E1U9W/giphy.gif');
        cy.getLastPostId().as('postId').then((postId) => {
            cy.get(`#post_${postId}`).find('.attachment__image').should((image) => {
                expect(image.width()).to.closeTo(480, 2);
            });
        });
    });
});