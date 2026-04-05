const webhookUtils = require('../../../../utils/webhook_utils');
let createdCommand;
let simpleDialog;
describe('Interactive Dialog - Apps Form', () => {
    before(() => {
        cy.apiSaveTeammateNameDisplayPreference('username');
        cy.requireWebhookServer();
        cy.apiCreateTeam('test-team', 'Test Team').then(({team}) => {
            cy.visit(`/${team.name}`);
            const webhookBaseUrl = Cypress.env().webhookBaseUrl;
            const command = {
                auto_complete: false,
                description: 'Test for boolean dialog',
                display_name: 'Simple Dialog with boolean element',
                icon_url: '',
                method: 'P',
                team_id: team.id,
                trigger: 'boolean_dialog',
                url: `${webhookBaseUrl}/boolean_dialog_request`,
                username: '',
            };
            cy.apiCreateCommand(command).then(({data}) => {
                createdCommand = data;
                simpleDialog = webhookUtils.getBooleanDialog(createdCommand.id, webhookBaseUrl);
            });
        });
    });
    it('MM-T2502 - Boolean element check', () => {
        cy.postMessage(`/${createdCommand.trigger} `);
        cy.get('#appsModal').should('be.visible').within(() => {
            cy.get('.modal-header').should('be.visible').within(($elForm) => {
                cy.get('#appsModalIconUrl').should('be.visible').and('have.attr', 'src').and('not.be.empty');
                cy.get('#appsModalLabel').should('be.visible').and('have.text', simpleDialog.dialog.title);
                cy.wrap($elForm).find('button.close').should('be.visible').and('contain', '×').and('contain', 'Close');
            });
            cy.get('.modal-body').should('be.visible').children('.form-group').should('have.length', 1).each(($elForm, index) => {
                const element = simpleDialog.dialog.elements[index];
                expect(element.name).to.equal('boolean_input');
                cy.wrap($elForm).within(() => {
                    cy.get('label').first().scrollIntoView().should('be.visible').and('contain', element.display_name);
                    cy.get('.checkbox').should('be.visible').within(() => {
                        cy.get('input[type=\'checkbox\']').
                            should('be.visible').
                            and('be.checked');
                        cy.get('span').should('have.text', element.placeholder);
                    });
                    if (element.help_text) {
                        cy.get('.help-text').should('be.visible').and('contain', element.help_text);
                    }
                });
            });
            cy.get('.modal-footer').should('be.visible').within(($elForm) => {
                cy.wrap($elForm).find('#appsModalCancel').should('be.visible').and('have.text', 'Cancel');
                cy.wrap($elForm).find('#appsModalSubmit').should('be.visible').and('have.text', simpleDialog.dialog.submit_label);
            });
            closeAppsFormModal();
        });
    });
});
function closeAppsFormModal() {
    cy.get('.modal-header').should('be.visible').within(($elForm) => {
        cy.wrap($elForm).find('button.close').should('be.visible').click();
    });
    cy.get('#appsModal').should('not.exist');
}