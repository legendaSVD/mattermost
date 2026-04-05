import * as TIMEOUTS from '../../../fixtures/timeouts';
let createdCommand;
describe('Interactive Dialog - Multiform (Step-by-step Form Submissions)', () => {
    before(() => {
        cy.shouldNotRunOnCloudEdition();
        cy.requireWebhookServer();
        cy.apiSaveTeammateNameDisplayPreference('username');
        cy.apiCreateTeam('test-team', 'Test Team').then(({team}) => {
            cy.visit(`/${team.name}`);
            const webhookBaseUrl = Cypress.env().webhookBaseUrl;
            const command = {
                auto_complete: false,
                description: 'Test for multiform functionality - step by step form submissions',
                display_name: 'Multiform Dialog Test',
                icon_url: '',
                method: 'P',
                team_id: team.id,
                trigger: 'multiform_dialog',
                url: `${webhookBaseUrl}/dialog/multistep`,
                username: '',
            };
            cy.apiCreateCommand(command).then(({data}) => {
                createdCommand = data;
            });
        });
    });
    afterEach(() => {
        cy.reload();
    });
    it('MM-T2550A - Multiform initial step (Step 1) UI verification', () => {
        cy.postMessage(`/${createdCommand.trigger} `);
        cy.get('#appsModal').should('be.visible').within(() => {
            cy.get('#appsModalLabel').should('contain', 'Step 1 - Personal Info');
            cy.get('#appsModalSubmit').should('contain', 'Next Step');
            cy.get('.modal-body').within(() => {
                cy.contains('First Name').should('be.visible');
                cy.contains('Email').should('be.visible');
                cy.get('.form-group').should('have.length', 2);
            });
            closeAppsFormModal();
        });
    });
    it('MM-T2550B - Complete multiform workflow: Step 1 → Step 2 → Step 3', () => {
        cy.postMessage(`/${createdCommand.trigger} `);
        cy.get('#appsModal').should('be.visible').within(() => {
            cy.get('#appsModalLabel').should('contain', 'Step 1 - Personal Info');
            cy.get('input[placeholder*="first name"]').type('John');
            cy.get('input[placeholder*="email"]').type('john.doe@example.com');
            cy.get('#appsModalSubmit').click();
        });
        cy.wait(TIMEOUTS.ONE_SEC);
        cy.get('#appsModal').should('be.visible').within(() => {
            cy.get('#appsModalLabel').should('contain', 'Step 2 - Work Info');
            cy.get('#appsModalSubmit').should('contain', 'Next Step');
            cy.get('.modal-body').within(() => {
                cy.contains('Department').should('be.visible');
                cy.contains('Experience Level').should('be.visible');
                cy.contains('First Name').should('not.exist');
                cy.contains('Email').should('not.exist');
            });
            cy.get('.form-group').contains('Department').parent().within(() => {
                cy.get('[id^=\'MultiInput_\']').click();
            });
            cy.wait(TIMEOUTS.HALF_SEC);
            cy.document().then((doc) => {
                cy.wrap(doc).find('.react-select__option').contains('Engineering').click();
            });
            cy.get('input[type="radio"][value="senior"]').click();
            cy.get('#appsModalSubmit').click();
        });
        cy.wait(TIMEOUTS.ONE_SEC);
        cy.get('#appsModal').should('be.visible').within(() => {
            cy.get('#appsModalLabel').should('contain', 'Step 3 - Final Details');
            cy.get('#appsModalSubmit').should('contain', 'Complete Registration');
            cy.get('.modal-body').within(() => {
                cy.contains('Comments').should('be.visible');
                cy.contains('Terms & Conditions').should('be.visible');
            });
            cy.get('textarea[placeholder*="comments"]').type('Multiform test completed successfully');
            cy.get('input[type="checkbox"]').check();
            cy.get('#appsModalSubmit').click();
        });
        cy.get('#appsModal').should('not.exist');
        cy.getLastPost().should('contain', 'Multistep completed successfully');
        cy.getLastPost().should('contain', 'Final step values');
    });
    it('MM-T2550C - Multiform step progression validation', () => {
        cy.postMessage(`/${createdCommand.trigger} `);
        cy.get('#appsModal').should('be.visible').within(() => {
            cy.get('#appsModalLabel').should('contain', 'Step 1 - Personal Info');
            cy.get('#appsModalSubmit').click();
        });
        cy.wait(TIMEOUTS.HALF_SEC);
        cy.get('#appsModal').should('be.visible').within(() => {
            cy.get('#appsModalLabel').should('contain', 'Step 1 - Personal Info');
            cy.get('.form-group').contains('First Name').parent().within(() => {
                cy.get('.error-text').should('be.visible');
            });
            cy.get('.form-group').contains('Email').parent().within(() => {
                cy.get('.error-text').should('be.visible');
            });
            closeAppsFormModal();
        });
    });
    it('MM-T2550D - Multiform cancellation at different steps', () => {
        cy.postMessage(`/${createdCommand.trigger} `);
        cy.get('#appsModal').should('be.visible').within(() => {
            cy.get('#appsModalLabel').should('contain', 'Step 1 - Personal Info');
            cy.get('#appsModalCancel').click();
        });
        cy.get('#appsModal').should('not.exist');
        cy.getLastPost().should('contain', 'Dialog cancelled');
        cy.postMessage(`/${createdCommand.trigger} `);
        cy.get('#appsModal').should('be.visible').within(() => {
            cy.get('input[placeholder*="first name"]').type('Jane');
            cy.get('input[placeholder*="email"]').type('jane@test.com');
            cy.get('#appsModalSubmit').click();
        });
        cy.wait(TIMEOUTS.ONE_SEC);
        cy.get('#appsModal').should('be.visible').within(() => {
            cy.get('#appsModalLabel').should('contain', 'Step 2 - Work Info');
            cy.get('#appsModalCancel').click();
        });
        cy.get('#appsModal').should('not.exist');
        cy.getLastPost().should('contain', 'Dialog cancelled');
    });
    it('MM-T2550E - Multiform maintains step-specific content', () => {
        cy.postMessage(`/${createdCommand.trigger} `);
        cy.get('#appsModal').should('be.visible').within(() => {
            cy.get('#appsModalLabel').should('contain', 'Step 1 - Personal Info');
            cy.contains('First Name').should('be.visible');
            cy.contains('Email').should('be.visible');
            cy.get('input[placeholder*="first name"]').type('Bob');
            cy.get('input[placeholder*="email"]').type('bob@company.com');
            cy.get('#appsModalSubmit').click();
        });
        cy.wait(TIMEOUTS.ONE_SEC);
        cy.get('#appsModal').should('be.visible').within(() => {
            cy.get('#appsModalLabel').should('contain', 'Step 2 - Work Info');
            cy.contains('Department').should('be.visible');
            cy.contains('Experience Level').should('be.visible');
            cy.contains('First Name').should('not.exist');
            cy.contains('Email').should('not.exist');
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