describe('Message Draft', () => {
    let testTeam;
    before(() => {
        cy.apiInitSetup({loginAfter: true}).then(({team, offTopicUrl}) => {
            testTeam = team;
            cy.visit(offTopicUrl);
        });
    });
    it('MM-T130 Message Draft Pencil Icon- Text', () => {
        cy.get('#sidebarItem_off-topic').findByTestId('draftIcon').should('not.exist');
        cy.uiGetPostTextBox().type('comm');
        cy.get('#sidebarItem_town-square').click({force: true});
        cy.url().should('include', `/${testTeam.name}/channels/town-square`);
        cy.get('#sidebarItem_off-topic').findByTestId('draftIcon').should('be.visible');
    });
});