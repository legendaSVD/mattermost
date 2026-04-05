import * as TIMEOUTS from '../../../fixtures/timeouts';
const webhookUtils = require('../../../../utils/webhook_utils');
let createdCommand;
let simpleDialog;
describe('Interactive Dialog - Apps Form without element', () => {
    before(() => {
        cy.shouldNotRunOnCloudEdition();
        cy.requireWebhookServer();
        cy.apiSaveTeammateNameDisplayPreference('username');
        cy.apiCreateTeam('test-team', 'Test Team').then(({team}) => {
            cy.visit(`/${team.name}`);
            const webhookBaseUrl = Cypress.env().webhookBaseUrl;
            const command = {
                auto_complete: false,
                description: 'Test for simple dialog - no element',
                display_name: 'Simple Dialog without element',
                icon_url: '',
                method: 'P',
                team_id: team.id,
                trigger: 'simple_dialog',
                url: `${webhookBaseUrl}/simple_dialog_request`,
                username: '',
            };
            cy.apiCreateCommand(command).then(({data}) => {
                createdCommand = data;
                simpleDialog = webhookUtils.getSimpleDialog(createdCommand.id, webhookBaseUrl);
            });
        });
    });
    afterEach(() => {
        cy.reload();
    });
    it('MM-T2500_1 UI check', () => {
        cy.postMessage(`/${createdCommand.trigger} `);
        cy.get('#appsModal').should('be.visible').within(() => {
            cy.get('.modal-header').should('be.visible').within(($elForm) => {
                cy.get('#appsModalIconUrl').should('be.visible').and('have.attr', 'src').and('not.be.empty');
                cy.get('#appsModalLabel').should('be.visible').and('have.text', simpleDialog.dialog.title);
                cy.wrap($elForm).find('button.close').should('be.visible').and('contain', '×').and('contain', 'Close');
            });
            cy.get('.modal-body').should('be.visible');
            cy.get('.modal-body').find('.form-group').should('not.exist');
            cy.get('.modal-footer').should('be.visible').within(($elForm) => {
                cy.wrap($elForm).find('#appsModalCancel').should('be.visible').and('have.text', 'Cancel');
                cy.wrap($elForm).find('#appsModalSubmit').should('be.visible').and('have.text', simpleDialog.dialog.submit_label);
            });
            closeAppsFormModal();
        });
    });
    it('MM-T2500_2 "X" closes the dialog', () => {
        cy.postMessage(`/${createdCommand.trigger} `);
        cy.get('#appsModal').should('be.visible');
        cy.get('.modal-header').should('be.visible').within(($elForm) => {
            cy.wrap($elForm).find('button.close').should('be.visible').click().wait(TIMEOUTS.FIVE_SEC);
        });
        cy.get('#appsModal').should('not.exist');
        cy.getLastPost().should('contain', 'Dialog cancelled');
    });
    it('MM-T2500_3 Cancel button works', () => {
        cy.postMessage(`/${createdCommand.trigger} `);
        cy.get('#appsModal').should('be.visible');
        cy.get('#appsModalCancel').click().wait(TIMEOUTS.FIVE_SEC);
        cy.get('#appsModal').should('not.exist');
        cy.getLastPost().should('contain', 'Dialog cancelled');
    });
    it('MM-T2500_4 Submit button works', () => {
        cy.postMessage(`/${createdCommand.trigger} `);
        cy.get('#appsModal').should('be.visible');
        cy.get('#appsModalSubmit').click();
        cy.get('#appsModal').should('not.exist');
        cy.getLastPost().should('contain', 'Dialog submitted');
    });
});
function closeAppsFormModal() {
    cy.get('.modal-header').should('be.visible').within(($elForm) => {
        cy.wrap($elForm).find('button.close').should('be.visible').click();
    });
    cy.get('#appsModal').should('not.exist');
}