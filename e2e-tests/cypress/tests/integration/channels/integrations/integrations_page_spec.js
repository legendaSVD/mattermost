describe('Integrations', () => {
    let teamA;
    before(() => {
        cy.apiInitSetup().then(({team}) => {
            teamA = team.name;
        });
    });
    it('MM-T569 Integrations Page', () => {
        cy.visit(`/${teamA}/integrations`);
        cy.viewport(500, 500);
        cy.get('.backstage-sidebar__category > .category-title').should('be.visible').and('have.attr', 'href', `/${teamA}/integrations`).click();
        cy.url().should('include', '/integrations');
        cy.get('#incomingWebhooks > .section-title').should('be.visible').and('have.attr', 'href', `/${teamA}/integrations/incoming_webhooks`).click();
        cy.url().should('include', '/incoming_webhooks');
        cy.get('#outgoingWebhooks > .section-title').should('be.visible').and('have.attr', 'href', `/${teamA}/integrations/outgoing_webhooks`).click();
        cy.url().should('include', '/outgoing_webhooks');
        cy.get('#slashCommands > .section-title').should('be.visible').and('have.attr', 'href', `/${teamA}/integrations/commands`).click();
        cy.url().should('include', 'commands');
        cy.get('#botAccounts > .section-title').should('be.visible').and('have.attr', 'href', `/${teamA}/integrations/bots`).click();
        cy.url().should('include', '/bots');
        cy.visit(`/${teamA}/integrations`);
        cy.get('.integrations-list.d-flex.flex-wrap').within(() => {
            cy.findByText('Incoming Webhooks').scrollIntoView().should('be.visible').click();
            cy.url().should('include', '/incoming_webhooks');
        });
        cy.visit(`/${teamA}/integrations`);
        cy.get('.integrations-list.d-flex.flex-wrap').within(() => {
            cy.findByText('Outgoing Webhooks').scrollIntoView().should('be.visible').click();
            cy.url().should('include', '/outgoing_webhooks');
        });
        cy.visit(`/${teamA}/integrations`);
        cy.get('.integrations-list.d-flex.flex-wrap').within(() => {
            cy.findByText('Slash Commands').scrollIntoView().should('be.visible').click();
            cy.url().should('include', '/commands');
        });
        cy.visit(`/${teamA}/integrations`);
        cy.get('.integrations-list.d-flex.flex-wrap').within(() => {
            cy.findByText('Bot Accounts').scrollIntoView().should('be.visible').click();
            cy.url().should('include', '/bots');
        });
    });
});