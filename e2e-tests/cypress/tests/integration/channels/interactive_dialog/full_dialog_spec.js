const webhookUtils = require('../../../../utils/webhook_utils');
describe('Interactive Dialog - Apps Form', () => {
    const inputTypes = {
        realname: 'text',
        someemail: 'email',
        somenumber: 'number',
        somepassword: 'password',
    };
    const optionsLength = {
        someuserselector: 25,
        somechannelselector: 2,
        someoptionselector: 3,
        someradiooptions: 2,
    };
    let createdCommand;
    let fullDialog;
    before(() => {
        cy.requireWebhookServer();
        cy.apiSaveTeammateNameDisplayPreference('username');
        cy.apiCreateTeam('test-team', 'Test Team').then(({team}) => {
            cy.visit(`/${team.name}`);
            const webhookBaseUrl = Cypress.env().webhookBaseUrl;
            const command = {
                auto_complete: false,
                description: 'Test for dialog',
                display_name: 'Dialog',
                icon_url: '',
                method: 'P',
                team_id: team.id,
                trigger: 'dialog',
                url: `${webhookBaseUrl}/dialog_request`,
                username: '',
            };
            cy.apiCreateCommand(command).then(({data}) => {
                createdCommand = data;
                fullDialog = webhookUtils.getFullDialog(createdCommand.id, webhookBaseUrl);
            });
        });
    });
    afterEach(() => {
        cy.reload();
    });
    it('MM-T2491 - UI check', () => {
        cy.get('#postListContent').should('be.visible');
        cy.postMessage(`/${createdCommand.trigger} `);
        cy.get('#appsModal').should('be.visible').within(() => {
            cy.get('.modal-header').should('be.visible').within(($elForm) => {
                cy.get('#appsModalIconUrl').should('be.visible').and('have.attr', 'src').and('not.be.empty');
                cy.get('#appsModalLabel').should('be.visible').and('have.text', fullDialog.dialog.title);
                cy.wrap($elForm).find('button.close').should('be.visible').and('contain', '×').and('contain', 'Close');
                cy.get('#appsModalLabel').should('be.visible').and('have.text', fullDialog.dialog.title);
            });
            cy.get('.modal-body').should('be.visible').children('.form-group').each(($elForm, index) => {
                const element = fullDialog.dialog.elements[index];
                if (!element) {
                    return;
                }
                cy.wrap($elForm).within(() => {
                    cy.get('label').first().scrollIntoView().should('be.visible').and('contain', element.display_name);
                    if (['someuserselector', 'somechannelselector', 'someoptionselector'].includes(element.name)) {
                        cy.get('[id^=\'MultiInput_\']').should('be.visible');
                        cy.get('[id^=\'MultiInput_\']').click();
                        cy.document().then((doc) => {
                            cy.wrap(doc).find('.react-select__menu').should('be.visible');
                        });
                        cy.get('label').first().click({force: true});
                    } else if (element.name === 'someradiooptions') {
                        cy.get('input').should('be.visible').and('have.length', optionsLength[element.name]);
                        cy.get('input').each(($elInput) => {
                            cy.wrap($elInput).should('not.be.checked');
                        });
                    } else if (element.name === 'boolean_input') {
                        cy.get('.checkbox').should('be.visible').within(() => {
                            cy.get('input[type=\'checkbox\']').
                                should('be.visible').
                                and('be.checked');
                            cy.get('span').should('have.text', element.placeholder);
                        });
                    } else {
                        cy.get(`#${element.name}`).should('be.visible').and('have.value', element.default || '').and('have.attr', 'placeholder', element.placeholder || '');
                    }
                    if (inputTypes[element.name]) {
                        cy.get(`#${element.name}`).should('have.attr', 'type', inputTypes[element.name]);
                    }
                    if (element.help_text) {
                        cy.get('.help-text').should('exist').and('contain', element.help_text);
                    }
                });
            });
            cy.get('.modal-footer').should('be.visible').within(($elForm) => {
                cy.wrap($elForm).find('#appsModalCancel').should('be.visible').and('have.text', 'Cancel');
                cy.wrap($elForm).find('#appsModalSubmit').should('be.visible').and('have.text', fullDialog.dialog.submit_label);
            });
            closeAppsFormModal();
        });
    });
    it('MM-T2492 - Cancel button works', () => {
        cy.postMessage(`/${createdCommand.trigger} `);
        cy.get('#appsModal').should('be.visible');
        cy.get('#appsModalCancel').click();
        cy.get('#appsModal').should('not.exist');
    });
    it('MM-T2493 - "X" closes the dialog', () => {
        cy.postMessage(`/${createdCommand.trigger} `);
        cy.get('#appsModal').should('be.visible');
        cy.get('.modal-header').should('be.visible').within(($elForm) => {
            cy.wrap($elForm).find('button.close').should('be.visible').click();
        });
        cy.get('#appsModal').should('not.exist');
    });
    it('MM-T2494 - Correct error messages displayed if empty form is submitted', () => {
        cy.postMessage(`/${createdCommand.trigger} `);
        cy.get('#appsModal').should('be.visible');
        cy.get('#appsModalSubmit').click();
        cy.get('#appsModal').should('be.visible');
        cy.get('.modal-body').should('be.visible').children('.form-group').each(($elForm, index) => {
            const element = fullDialog.dialog.elements[index];
            if (!element.optional && !element.default) {
                cy.wrap($elForm).find('div.error-text').should('exist').and('contain', 'This field is required.');
            } else {
                cy.wrap($elForm).find('div.error-text').should('not.exist');
            }
        });
        closeAppsFormModal();
    });
    it('MM-T2495_1 - Email validation for invalid input', () => {
        cy.postMessage(`/${createdCommand.trigger} `);
        cy.get('#appsModal').should('be.visible');
        const invalidEmail = 'invalid-email';
        cy.get('#someemail').scrollIntoView().clear().type(invalidEmail);
        cy.get('#appsModalSubmit').click();
        cy.get('input:invalid').should('have.length', 1);
        cy.get('#someemail').then(($input) => {
            expect($input[0].validationMessage).to.eq(`Please include an '@' in the email address. '${invalidEmail}' is missing an '@'.`);
        });
        closeAppsFormModal();
    });
    it('MM-T2495_2 - Email validation for valid input', () => {
        cy.postMessage(`/${createdCommand.trigger} `);
        cy.get('#appsModal').should('be.visible');
        const validEmail = 'test@mattermost.com';
        cy.get('#someemail').scrollIntoView().clear().type(validEmail);
        cy.get('#appsModalSubmit').click();
        cy.get('input:invalid').should('have.length', 0);
        closeAppsFormModal();
    });
    it('MM-T2496_1 - Number validation for invalid input', () => {
        cy.postMessage(`/${createdCommand.trigger} `);
        cy.get('#appsModal').should('be.visible');
        const invalidNumber = 'invalid-number';
        cy.get('#somenumber').scrollIntoView().clear().type(invalidNumber);
        cy.get('#appsModalSubmit').click();
        cy.get('.modal-body').should('be.visible').children('.form-group').eq(2).within(($elForm) => {
            cy.wrap($elForm).find('div.error-text').should('exist').and('contain', 'This field is required.');
        });
        closeAppsFormModal();
    });
    it('MM-T2496_2 - Number validation for valid input', () => {
        cy.postMessage(`/${createdCommand.trigger} `);
        cy.get('#appsModal').should('be.visible');
        const validNumber = 12;
        cy.get('#somenumber').scrollIntoView().clear().type(validNumber);
        cy.get('#appsModalSubmit').click();
        cy.get('.modal-body').should('be.visible').children('.form-group').eq(2).within(($elForm) => {
            cy.wrap($elForm).find('div.error-text').should('not.exist');
        });
        closeAppsFormModal();
    });
    it('MM-T2501 - Password element check', () => {
        cy.postMessage(`/${createdCommand.trigger} `);
        cy.get('#appsModal').should('be.visible');
        cy.get('#somepassword').should('be.visible');
        cy.get('#somepassword').should('have.attr', 'type', 'password');
        closeAppsFormModal();
    });
});
function closeAppsFormModal() {
    cy.get('.modal-header').should('be.visible').within(($elForm) => {
        cy.wrap($elForm).find('button.close').should('be.visible').click();
    });
    cy.get('#appsModal').should('not.exist');
}