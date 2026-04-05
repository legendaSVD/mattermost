describe('Integrations', () => {
    const maxDescription = '1234567890'.repeat(50);
    const overMaxDescription = `${maxDescription}123`;
    let testTeam;
    before(() => {
        cy.apiInitSetup().then(({team}) => {
            testTeam = team;
            cy.visit(`/${team.name}/integrations/incoming_webhooks/add`);
        });
    });
    it('MM-T636 Description field length check', () => {
        cy.get('#description').clear().type(maxDescription).should('have.value', maxDescription);
        cy.get('#description').clear().type(overMaxDescription).should('have.value', maxDescription);
        cy.visit(`/${testTeam.name}/integrations/outgoing_webhooks/add`);
        cy.get('#description').clear().type(maxDescription).should('have.value', maxDescription);
        cy.get('#description').clear().type(overMaxDescription).should('have.value', maxDescription);
    });
});