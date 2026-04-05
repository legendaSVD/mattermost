describe('Hide ephemeral message on refresh', () => {
    let offtopiclink;
    before(() => {
        cy.apiInitSetup({loginAfter: true}).then(({team}) => {
            offtopiclink = `/${team.name}/channels/off-topic`;
            cy.visit(offtopiclink);
        });
    });
    it('MM-T2197 Ephemeral message disappears in center after refresh', () => {
        cy.get('#sidebarItem_off-topic').click({force: true});
        cy.url().should('include', offtopiclink);
        cy.apiUpdateUserStatus('online');
        cy.postMessage('/offline ');
        cy.getLastPostId().then((postID) => {
            cy.get(`#postMessageText_${postID}`).should('have.text', 'You are now offline');
            cy.reload();
            cy.visit(offtopiclink);
            cy.get(`#postMessageText_${postID}`).should('not.exist');
        });
    });
});