import * as TIMEOUTS from '../../../fixtures/timeouts';
const webhookUtils = require('../../../../utils/webhook_utils');
let createdCommandWithDefaults;
let createdCommandClean;
let multiSelectDialogWithDefaults;
let multiSelectDialogClean;
describe('Interactive Dialog - Multiselect', () => {
    before(() => {
        cy.shouldNotRunOnCloudEdition();
        cy.requireWebhookServer();
        cy.apiSaveTeammateNameDisplayPreference('username');
        cy.apiCreateTeam('test-team', 'Test Team').then(({team}) => {
            cy.visit(`/${team.name}`);
            const webhookBaseUrl = Cypress.env().webhookBaseUrl;
            const commandWithDefaults = {
                auto_complete: false,
                description: 'Test for multiselect dialog elements with defaults',
                display_name: 'Multiselect Dialog Test (Defaults)',
                icon_url: '',
                method: 'P',
                team_id: team.id,
                trigger: 'multiselect_dialog_defaults',
                url: `${webhookBaseUrl}/multiselect_dialog_request?includeDefaults=true`,
                username: '',
            };
            const commandClean = {
                auto_complete: false,
                description: 'Test for multiselect dialog elements (clean)',
                display_name: 'Multiselect Dialog Test (Clean)',
                icon_url: '',
                method: 'P',
                team_id: team.id,
                trigger: 'multiselect_dialog_clean',
                url: `${webhookBaseUrl}/multiselect_dialog_request?includeDefaults=false`,
                username: '',
            };
            cy.apiCreateCommand(commandWithDefaults).then(({data}) => {
                createdCommandWithDefaults = data;
                multiSelectDialogWithDefaults = webhookUtils.getMultiSelectDialog(createdCommandWithDefaults.id, webhookBaseUrl, true);
            });
            cy.apiCreateCommand(commandClean).then(({data}) => {
                createdCommandClean = data;
                multiSelectDialogClean = webhookUtils.getMultiSelectDialog(createdCommandClean.id, webhookBaseUrl, false);
            });
        });
    });
    afterEach(() => {
        cy.reload();
    });
    it('MM-T2510A - Multiselect default values verification', () => {
        cy.postMessage(`/${createdCommandWithDefaults.trigger} `);
        cy.get('#appsModal').should('be.visible').within(() => {
            cy.get('.modal-header').should('be.visible').within(() => {
                cy.get('#appsModalLabel').should('be.visible').and('have.text', multiSelectDialogWithDefaults.dialog.title);
            });
            cy.get('.modal-body').should('be.visible').children('.form-group').each(($elForm, index) => {
                const element = multiSelectDialogWithDefaults.dialog.elements[index];
                if (!element) {
                    return;
                }
                cy.wrap($elForm).within(() => {
                    if (element.name === 'multiselect_options') {
                        cy.get('.react-select__multi-value').should('have.length', 2);
                        cy.get('.react-select__multi-value').eq(0).should('contain', 'Engineering');
                        cy.get('.react-select__multi-value').eq(1).should('contain', 'Marketing');
                    } else if (element.name === 'multiselect_users') {
                        cy.get('.react-select__multi-value').should('not.exist');
                    } else if (element.name === 'single_select_options') {
                        cy.get('.react-select__single-value').should('contain', 'Single Option 2');
                    }
                });
            });
            closeAppsFormModal();
        });
    });
    it('MM-T2510B - Multiselect UI and functionality (clean)', () => {
        cy.postMessage(`/${createdCommandClean.trigger} `);
        cy.get('#appsModal').should('be.visible').within(() => {
            cy.get('.modal-header').should('be.visible').within(($elForm) => {
                cy.get('#appsModalIconUrl').should('be.visible').and('have.attr', 'src').and('not.be.empty');
                cy.get('#appsModalLabel').should('be.visible').and('have.text', multiSelectDialogClean.dialog.title);
                cy.wrap($elForm).find('button.close').should('be.visible').and('contain', '×').and('contain', 'Close');
            });
            cy.get('.modal-body').should('be.visible').children('.form-group').should('have.length', 3).each(($elForm, index) => {
                const element = multiSelectDialogClean.dialog.elements[index];
                if (!element) {
                    return;
                }
                cy.wrap($elForm).within(() => {
                    cy.get('label').first().scrollIntoView().should('be.visible').and('contain', element.display_name);
                    if (element.name === 'multiselect_options') {
                        cy.get('[id^=\'MultiInput_\']').should('be.visible');
                        cy.get('.react-select__multi-value').should('not.exist');
                        cy.get('[id^=\'MultiInput_\']').click();
                        cy.document().then((doc) => {
                            cy.wrap(doc).find('.react-select__option').contains('Engineering').click();
                        });
                        cy.get('[id^=\'MultiInput_\']').click();
                        cy.document().then((doc) => {
                            cy.wrap(doc).find('.react-select__option').contains('Sales').click();
                        });
                        cy.get('.react-select__multi-value').should('have.length', 2);
                        cy.get('.react-select__multi-value').eq(0).should('contain', 'Engineering');
                        cy.get('.react-select__multi-value').eq(1).should('contain', 'Sales');
                        cy.get('.react-select__multi-value').eq(0).find('.react-select__multi-value__remove').click();
                        cy.get('.react-select__multi-value').should('have.length', 1);
                        cy.get('.react-select__multi-value').eq(0).should('contain', 'Sales');
                    } else if (element.name === 'multiselect_users') {
                        cy.get('[id^=\'MultiInput_\']').should('be.visible');
                        cy.get('.react-select__multi-value').should('not.exist');
                        cy.get('[id^=\'MultiInput_\']').click();
                        cy.document().then((doc) => {
                            cy.wrap(doc).find('.react-select__option').should('have.length.at.least', 1);
                            cy.wrap(doc).find('.react-select__option').first().click();
                        });
                        cy.get('[id^=\'MultiInput_\']').click();
                        cy.document().then((doc) => {
                            cy.wrap(doc).find('.react-select__option').eq(1).click();
                        });
                        cy.get('.react-select__multi-value').should('have.length', 2);
                    } else if (element.name === 'single_select_options') {
                        cy.get('[id^=\'MultiInput_\']').should('be.visible');
                        cy.get('[id^=\'MultiInput_\']').click();
                        cy.document().then((doc) => {
                            cy.wrap(doc).find('.react-select__option').contains('Single Option 3').click();
                        });
                        cy.get('.react-select__single-value').should('contain', 'Single Option 3');
                    }
                    if (element.help_text) {
                        cy.get('.help-text').should('be.visible').and('contain', element.help_text);
                    }
                });
            });
            cy.get('.modal-footer').should('be.visible').within(($elForm) => {
                cy.wrap($elForm).find('#appsModalCancel').should('be.visible').and('have.text', 'Cancel');
                cy.wrap($elForm).find('#appsModalSubmit').should('be.visible').and('have.text', multiSelectDialogClean.dialog.submit_label);
            });
            closeAppsFormModal();
        });
    });
    it('MM-T2511A - Multiselect form submission with defaults', () => {
        cy.postMessage(`/${createdCommandWithDefaults.trigger} `);
        cy.get('#appsModal').should('be.visible').within(() => {
            cy.get('.form-group').eq(0).within(() => {
                cy.get('[id^=\'MultiInput_\']').click();
            });
            cy.document().then((doc) => {
                cy.wrap(doc).find('.react-select__option').contains('Support').click();
            });
            cy.get('.form-group').eq(1).within(() => {
                cy.get('[id^=\'MultiInput_\']').click();
            });
            cy.document().then((doc) => {
                cy.wrap(doc).find('.react-select__option').first().click();
            });
            cy.get('.form-group').eq(1).within(() => {
                cy.get('[id^=\'MultiInput_\']').click();
            });
            cy.document().then((doc) => {
                cy.wrap(doc).find('.react-select__option').eq(1).click();
            });
            cy.intercept('/api/v4/actions/dialogs/submit').as('submitAction');
            cy.get('#appsModalSubmit').click();
        });
        cy.get('#appsModal').should('not.exist');
        cy.wait('@submitAction').should('include.all.keys', ['request', 'response']).then((result) => {
            const {submission} = result.request.body;
            expect(submission.multiselect_options).to.be.an('array');
            expect(submission.multiselect_options).to.include.members(['opt1', 'opt3', 'opt4']);
            expect(submission.multiselect_users).to.be.an('array');
            expect(submission.multiselect_users).to.have.length(2);
            expect(submission.single_select_options).to.be.a('string');
            expect(submission.single_select_options).to.equal('single2');
        });
        cy.getLastPost().should('contain', 'Dialog submitted');
    });
    it('MM-T2511B - Multiselect form submission (clean)', () => {
        cy.postMessage(`/${createdCommandClean.trigger} `);
        cy.get('#appsModal').should('be.visible').within(() => {
            cy.get('.form-group').eq(0).within(() => {
                cy.get('[id^=\'MultiInput_\']').click();
            });
            cy.document().then((doc) => {
                cy.wrap(doc).find('.react-select__option').contains('Engineering').click();
            });
            cy.get('.form-group').eq(0).within(() => {
                cy.get('[id^=\'MultiInput_\']').click();
            });
            cy.document().then((doc) => {
                cy.wrap(doc).find('.react-select__option').contains('Sales').click();
            });
            cy.get('.form-group').eq(1).within(() => {
                cy.get('[id^=\'MultiInput_\']').click();
            });
            cy.document().then((doc) => {
                cy.wrap(doc).find('.react-select__option').first().click();
            });
            cy.get('.form-group').eq(1).within(() => {
                cy.get('[id^=\'MultiInput_\']').click();
            });
            cy.document().then((doc) => {
                cy.wrap(doc).find('.react-select__option').eq(1).click();
            });
            cy.get('.form-group').eq(2).within(() => {
                cy.get('[id^=\'MultiInput_\']').click();
            });
            cy.document().then((doc) => {
                cy.wrap(doc).find('.react-select__option').contains('Single Option 1').click();
            });
            cy.intercept('/api/v4/actions/dialogs/submit').as('submitAction');
            cy.get('#appsModalSubmit').click();
        });
        cy.get('#appsModal').should('not.exist');
        cy.wait('@submitAction').should('include.all.keys', ['request', 'response']).then((result) => {
            const {submission} = result.request.body;
            expect(submission.multiselect_options).to.be.an('array');
            expect(submission.multiselect_options).to.include.members(['opt1', 'opt2']);
            expect(submission.multiselect_users).to.be.an('array');
            expect(submission.multiselect_users).to.have.length(2);
            expect(submission.single_select_options).to.be.a('string');
            expect(submission.single_select_options).to.equal('single1');
        });
        cy.getLastPost().should('contain', 'Dialog submitted');
    });
    it('MM-T2512 - Multiselect validation error handling', () => {
        cy.postMessage(`/${createdCommandClean.trigger} `);
        cy.get('#appsModal').should('be.visible').within(() => {
            cy.get('.form-group').eq(0).within(() => {
                cy.get('label').should('contain', 'Multi Option Selector');
                cy.get('.react-select__multi-value').should('not.exist');
            });
            cy.wait(TIMEOUTS.HALF_SEC);
            cy.get('#appsModalSubmit').click();
        });
        cy.get('#appsModal').should('be.visible');
        cy.get('#appsModal').within(() => {
            cy.get('.form-group').eq(0).within(() => {
                cy.get('.error-text').should('be.visible').and('contain', 'This field is required');
            });
        });
        closeAppsFormModal();
    });
    it('MM-T2513 - Multiselect with keyboard navigation', () => {
        cy.postMessage(`/${createdCommandClean.trigger} `);
        cy.get('#appsModal').should('be.visible').within(() => {
            cy.get('.form-group').eq(0).within(() => {
                cy.get('[id^=\'MultiInput_\']').click().type('{downarrow}{downarrow}{enter}');
                cy.get('.react-select__multi-value').should('have.length', 1);
                cy.get('.react-select__multi-value').should('contain', 'Sales');
                cy.get('[id^=\'MultiInput_\']').click().type('Prod{enter}');
                cy.get('.react-select__multi-value').should('have.length', 2);
                cy.get('.react-select__multi-value').should('contain', 'Product');
                cy.wait(TIMEOUTS.HALF_SEC);
                cy.get('.react-select__multi-value').contains('Product').parent().within(() => {
                    cy.get('.react-select__multi-value__remove').click();
                });
                cy.get('.react-select__multi-value').should('have.length', 1);
                cy.get('.react-select__multi-value').should('not.contain', 'Product');
            });
        });
        cy.get('body').then(($body) => {
            if ($body.find('.react-select__menu').length > 0) {
                cy.get('.react-select__menu').should('not.be.visible');
            }
        });
        closeAppsFormModal();
    });
    it('MM-T2514 - Multiselect accessibility check', () => {
        cy.postMessage(`/${createdCommandClean.trigger} `);
        cy.get('#appsModal').should('be.visible').within(() => {
            cy.get('.form-group').eq(0).within(() => {
                cy.get('label').should('be.visible').and('contain', 'Multi Option Selector');
                cy.get('[id^=\'MultiInput_\']').should('be.visible');
                cy.get('.help-text').should('be.visible').and('contain', 'You can select multiple options');
                cy.get('[id^=\'MultiInput_\']').click();
                cy.document().then((doc) => {
                    cy.wrap(doc).find('.react-select__option').should('have.length.at.least', 1);
                });
            });
            cy.get('.modal-body').click({force: true});
        });
        closeAppsFormModal();
    });
});
function closeAppsFormModal() {
    cy.get('.modal-header').should('be.visible').within(($elForm) => {
        cy.wrap($elForm).find('button.close').should('be.visible').click();
    });
    cy.get('#appsModal').should('not.exist');
}