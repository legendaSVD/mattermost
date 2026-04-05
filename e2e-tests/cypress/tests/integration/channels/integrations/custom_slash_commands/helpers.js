import * as TIMEOUTS from '../../../../fixtures/timeouts';
export function addNewCommand(team, trigger, url) {
    cy.visit(`/${team.name}/integrations/commands/installed`);
    cy.get('#addSlashCommand').click();
    cy.get('#trigger').type(trigger);
    cy.get('#displayName').type('Test Message');
    cy.apiGetChannelByName(team.name, 'town-square').then(({channel}) => {
        let urlToType = url;
        if (url === '') {
            urlToType = `${Cypress.env('webhookBaseUrl')}/send_message_to_channel?channel_id=${channel.id}`;
        }
        cy.get('#url').type(urlToType);
        cy.get('#saveCommand').click();
        cy.url().should('include', '/integrations/commands/confirm');
        cy.findByText('Setup Successful').should('exist').and('be.visible');
        cy.findByText('Token').should('exist').and('be.visible');
    });
}
export function runSlashCommand(linkToVisit, trigger) {
    cy.visit(linkToVisit);
    cy.uiGetPostTextBox().clear().type(`/${trigger}{enter}{enter}`);
    cy.wait(TIMEOUTS.TWO_SEC);
    cy.getLastPostId().then((postId) => {
        cy.get(`#post_${postId}`).get('.Tag').contains('BOT');
    });
}