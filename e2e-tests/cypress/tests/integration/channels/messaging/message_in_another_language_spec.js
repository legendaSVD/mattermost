describe('Messaging', () => {
    before(() => {
        cy.apiInitSetup({loginAfter: true}).then(({team}) => {
            cy.visit(`/${team.name}/channels/off-topic`);
        });
    });
    it('MM-T182 Typing using CJK keyboard', () => {
        const msg = '안녕하세요';
        const msg2 = '닥터 카레브';
        cy.postMessage(msg);
        cy.getLastPost().should('contain', msg);
        cy.clickPostCommentIcon();
        cy.postMessageReplyInRHS(msg2);
        cy.getLastPost().should('contain', msg2);
    });
});