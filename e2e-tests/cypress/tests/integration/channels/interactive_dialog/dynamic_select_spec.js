import * as TIMEOUTS from '../../../fixtures/timeouts';
const webhookUtils = require('../../../../utils/webhook_utils');
let createdCommand;
let dynamicSelectDialog;
describe('Interactive Dialog - Dynamic Select', () => {
    before(() => {
        cy.shouldNotRunOnCloudEdition();
        cy.requireWebhookServer();
        cy.apiSaveTeammateNameDisplayPreference('username');
        cy.apiCreateTeam('test-team', 'Test Team').then(({team}) => {
            cy.visit(`/${team.name}`);
            const webhookBaseUrl = Cypress.env().webhookBaseUrl;
            const command = {
                auto_complete: false,
                description: 'Test for dynamic select dialog elements',
                display_name: 'Dynamic Select Dialog Test',
                icon_url: '',
                method: 'P',
                team_id: team.id,
                trigger: 'dynamic_select_dialog',
                url: `${webhookBaseUrl}/dynamic_select_dialog_request`,
                username: '',
            };
            cy.apiCreateCommand(command).then(({data}) => {
                createdCommand = data;
                dynamicSelectDialog = webhookUtils.getDynamicSelectDialog(createdCommand.id, webhookBaseUrl);
            });
        });
    });
    afterEach(() => {
        cy.reload();
    });
    it('MM-T2520A - Dynamic select UI and structure verification', () => {
        cy.postMessage(`/${createdCommand.trigger} `);
        cy.get('#appsModal').should('be.visible').within(() => {
            cy.get('.modal-header').should('be.visible').within(() => {
                cy.get('#appsModalLabel').should('be.visible').and('have.text', dynamicSelectDialog.dialog.title);
                cy.get('#appsModalIconUrl').should('be.visible').and('have.attr', 'src').and('not.be.empty');
                cy.get('button.close').should('be.visible').and('contain', '×').and('contain', 'Close');
            });
            cy.get('.modal-body').should('be.visible').children('.form-group').should('have.length', 2).each(($elForm, index) => {
                const element = dynamicSelectDialog.dialog.elements[index];
                if (!element) {
                    return;
                }
                cy.wrap($elForm).within(() => {
                    cy.get('label').first().scrollIntoView().should('be.visible').and('contain', element.display_name);
                    if (element.name === 'dynamic_role_selector') {
                        cy.get('[id^=\'MultiInput_\']').should('be.visible');
                        cy.get('.react-select__single-value').should('not.exist');
                        cy.get('.react-select__placeholder').should('contain', element.placeholder);
                    } else if (element.name === 'optional_dynamic_selector') {
                        cy.get('[id^=\'MultiInput_\']').should('be.visible');
                    }
                    if (element.help_text) {
                        cy.get('.help-text').should('be.visible').and('contain', element.help_text);
                    }
                });
            });
            cy.get('.modal-footer').should('be.visible').within(($elForm) => {
                cy.wrap($elForm).find('#appsModalCancel').should('be.visible').and('have.text', 'Cancel');
                cy.wrap($elForm).find('#appsModalSubmit').should('be.visible').and('have.text', dynamicSelectDialog.dialog.submit_label);
            });
            closeAppsFormModal();
        });
    });
    it('MM-T2520B - Dynamic select search functionality', () => {
        cy.postMessage(`/${createdCommand.trigger} `);
        cy.get('#appsModal').should('be.visible').within(() => {
            cy.get('.form-group').eq(0).within(() => {
                cy.get('[id^=\'MultiInput_\']').click();
                cy.wait(TIMEOUTS.HALF_SEC);
                cy.document().then((doc) => {
                    cy.wrap(doc).find('.react-select__option').should('have.length.at.least', 1);
                    cy.wrap(doc).find('.react-select__option').first().should('contain', 'Backend Engineer');
                });
                cy.get('.react-select__control').click().type('frontend');
                cy.wait(TIMEOUTS.ONE_SEC);
                cy.document().then((doc) => {
                    cy.wrap(doc).find('.react-select__option').should('have.length.at.least', 1);
                    cy.wrap(doc).find('.react-select__option').each(($option) => {
                        cy.wrap($option).should('contain.text', 'Frontend');
                    });
                });
                cy.document().then((doc) => {
                    cy.wrap(doc).find('.react-select__option').contains('Frontend Engineer').click();
                });
                cy.get('.react-select__single-value').should('contain', 'Frontend Engineer');
            });
            closeAppsFormModal();
        });
    });
    it('MM-T2520C - Dynamic select with different search terms', () => {
        cy.postMessage(`/${createdCommand.trigger} `);
        cy.get('#appsModal').should('be.visible').within(() => {
            cy.get('.form-group').eq(0).within(() => {
                cy.get('[id^=\'MultiInput_\']').click().type('manager');
                cy.wait(TIMEOUTS.HALF_SEC);
                cy.document().then((doc) => {
                    cy.wrap(doc).find('.react-select__option').should('have.length.at.least', 1);
                    cy.wrap(doc).find('.react-select__option').each(($option) => {
                        cy.wrap($option).invoke('text').should('match', /manager/i);
                    });
                });
                cy.get('[id^=\'MultiInput_\']').click().type('senior');
                cy.wait(TIMEOUTS.HALF_SEC);
                cy.document().then((doc) => {
                    cy.wrap(doc).find('.react-select__option').should('have.length.at.least', 1);
                    cy.wrap(doc).find('.react-select__option').each(($option) => {
                        cy.wrap($option).invoke('text').should('match', /senior/i);
                    });
                });
                cy.get('[id^=\'MultiInput_\']').type('xyz123nomatch');
                cy.wait(TIMEOUTS.HALF_SEC);
                cy.document().then((doc) => {
                    cy.wrap(doc).find('.react-select__menu').then(($menu) => {
                        if ($menu.length > 0) {
                            cy.wrap(doc).find('.react-select__option, .react-select__menu-notice--no-options').should('exist');
                        }
                    });
                });
                cy.wait(TIMEOUTS.HALF_SEC);
                cy.get('[id^=\'MultiInput_\']').click();
                cy.wait(TIMEOUTS.HALF_SEC);
                cy.get('[id^=\'MultiInput_\']').click();
                cy.document().then((doc) => {
                    cy.wrap(doc).find('.react-select__option').first().click();
                });
            });
            closeAppsFormModal();
        });
    });
    it('MM-T2521A - Dynamic select form submission', () => {
        cy.postMessage(`/${createdCommand.trigger} `);
        cy.get('#appsModal').should('be.visible').within(() => {
            cy.get('.form-group').eq(0).within(() => {
                cy.get('[id^=\'MultiInput_\']').click();
            });
            cy.wait(TIMEOUTS.HALF_SEC);
            cy.document().then((doc) => {
                cy.wrap(doc).find('.react-select__option').contains('DevOps Engineer').click();
            });
            cy.get('.form-group').eq(1).within(() => {
                cy.get('[id^=\'MultiInput_\']').click();
            });
            cy.wait(TIMEOUTS.HALF_SEC);
            cy.document().then((doc) => {
                cy.wrap(doc).find('.react-select__option').contains('QA Engineer').click();
            });
            cy.intercept('POST', '/api/v4/actions/dialogs/submit').as('submitAction');
            cy.get('#appsModalSubmit').click();
        });
        cy.get('#appsModal').should('not.exist');
        cy.wait('@submitAction').should('include.all.keys', ['request', 'response']).then((result) => {
            const {submission} = result.request.body;
            expect(submission.dynamic_role_selector).to.equal('devops_eng');
            expect(submission.optional_dynamic_selector).to.equal('qa_eng');
        });
        cy.getLastPost().should('contain', 'Dialog submitted');
    });
    it('MM-T2521B - Dynamic select validation error handling', () => {
        cy.postMessage(`/${createdCommand.trigger} `);
        cy.get('#appsModal').should('be.visible').within(() => {
            cy.get('.form-group').eq(0).within(() => {
                cy.get('.react-select__single-value').should('not.exist');
            });
            cy.get('#appsModalSubmit').click();
            cy.wait(TIMEOUTS.HALF_SEC);
        });
        cy.get('#appsModal').should('be.visible');
        cy.get('#appsModal').within(() => {
            cy.get('.form-group').eq(0).within(() => {
                cy.get('.error-text').should('be.visible').and('contain', 'This field is required');
            });
        });
        closeAppsFormModal();
    });
    it('MM-T2522 - Dynamic select keyboard navigation', () => {
        cy.postMessage(`/${createdCommand.trigger} `);
        cy.get('#appsModal').should('be.visible').within(() => {
            cy.get('.form-group').eq(0).within(() => {
                cy.get('[id^=\'MultiInput_\']').click();
                cy.wait(TIMEOUTS.HALF_SEC);
                cy.get('[id^=\'MultiInput_\']').type('{downarrow}{downarrow}{enter}');
                cy.get('.react-select__single-value').should('exist').and('not.be.empty');
            });
            closeAppsFormModal();
        });
    });
    it('MM-T2523 - Dynamic select accessibility check', () => {
        cy.postMessage(`/${createdCommand.trigger} `);
        cy.get('#appsModal').should('be.visible').within(() => {
            cy.get('.form-group').eq(0).within(() => {
                cy.get('label').should('be.visible').and('contain', 'Dynamic Role Selector');
                cy.get('[id^=\'MultiInput_\']').should('be.visible');
                cy.get('.help-text').should('be.visible').and('contain', 'Start typing to search');
                cy.get('[id^=\'MultiInput_\']').click();
                cy.wait(TIMEOUTS.HALF_SEC);
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