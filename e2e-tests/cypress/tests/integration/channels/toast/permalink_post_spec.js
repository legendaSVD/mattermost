describe('Toast', () => {
    let testTeam;
    before(() => {
        cy.apiInitSetup({loginAfer: true}).then(({team, offTopicUrl}) => {
            testTeam = team;
            cy.visit(offTopicUrl);
        });
    });
    it('MM-T1792 Permalink post', () => {
        cy.postMessage('test');
        cy.getLastPostId().then((id) => {
            const permalink = `${Cypress.config('baseUrl')}/${testTeam.name}/pl/${id}`;
            cy.get(`#CENTER_button_${id}`).should('not.be.visible');
            cy.clickPostDotMenu(id);
            cy.uiClickCopyLink(permalink, id);
            cy.postMessage(permalink);
            cy.getLastPost().get('.post-message__text a').last().scrollIntoView().click();
            cy.url().should('include', `/${testTeam.name}/channels/off-topic/${id}`);
            cy.get(`#post_${id}`).should('have.class', 'post--highlight');
            cy.get(`#post_${id}`).should('not.have.class', 'post--highlight');
            cy.url().should('include', `/${testTeam.name}/channels/off-topic`).and('not.include', id);
        });
    });
});