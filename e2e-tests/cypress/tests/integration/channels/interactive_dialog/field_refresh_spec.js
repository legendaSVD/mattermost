import * as TIMEOUTS from '../../../fixtures/timeouts';
let createdCommand;
describe('Interactive Dialog - Field Refresh', () => {
    before(() => {
        cy.shouldNotRunOnCloudEdition();
        cy.requireWebhookServer();
        cy.apiSaveTeammateNameDisplayPreference('username');
        cy.apiCreateTeam('test-team', 'Test Team').then(({team}) => {
            cy.visit(`/${team.name}`);
            const webhookBaseUrl = Cypress.env().webhookBaseUrl;
            const command = {
                auto_complete: false,
                description: 'Test for field refresh functionality',
                display_name: 'Field Refresh Dialog Test',
                icon_url: '',
                method: 'P',
                team_id: team.id,
                trigger: 'field_refresh_dialog',
                url: `${webhookBaseUrl}/dialog/field-refresh`,
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
    it('MM-T2540A - Field refresh changes form content within same modal', () => {
        cy.postMessage(`/${createdCommand.trigger} `);
        cy.get('#appsModal').should('be.visible').within(() => {
            cy.get('#appsModalLabel').should('contain', 'Field Refresh Demo');
            cy.get('.modal-body').within(() => {
                cy.contains('Project Name').should('be.visible');
                cy.contains('Project Type').should('be.visible');
                cy.get('.form-group').should('have.length', 2);
            });
            cy.get('input[placeholder*="project name"]').type('Web App Project');
            cy.get('.form-group').contains('Project Type').parent().within(() => {
                cy.get('[id^=\'MultiInput_\']').click();
            });
            cy.wait(TIMEOUTS.HALF_SEC);
            cy.document().then((doc) => {
                cy.wrap(doc).find('.react-select__option').contains('Web Application').click();
            });
            cy.wait(TIMEOUTS.ONE_SEC);
            cy.get('#appsModalLabel').should('contain', 'Field Refresh Demo');
            cy.get('.modal-body').within(() => {
                cy.contains('Project Name').should('be.visible');
                cy.contains('Project Type').should('be.visible');
                cy.get('input[placeholder*="project name"]').should('have.value', 'Web App Project');
                cy.get('.react-select__single-value').should('contain', 'Web Application');
                cy.contains('Framework').should('be.visible');
                cy.get('.form-group').should('have.length', 3);
            });
            closeAppsFormModal();
        });
    });
    it('MM-T2540B - Field values preserved during refresh and form submits successfully', () => {
        cy.postMessage(`/${createdCommand.trigger} `);
        cy.get('#appsModal').should('be.visible').within(() => {
            cy.get('input[placeholder*="project name"]').type('My Test Project');
            cy.get('.form-group').contains('Project Type').parent().within(() => {
                cy.get('[id^=\'MultiInput_\']').click();
            });
            cy.wait(TIMEOUTS.HALF_SEC);
            cy.document().then((doc) => {
                cy.wrap(doc).find('.react-select__option').contains('Mobile App').click();
            });
            cy.wait(TIMEOUTS.ONE_SEC);
            cy.get('input[placeholder*="project name"]').should('have.value', 'My Test Project');
            cy.get('.react-select__single-value').should('contain', 'Mobile App');
            cy.contains('Platform').should('be.visible');
            cy.get('.form-group').contains('Platform').parent().within(() => {
                cy.get('[id^=\'MultiInput_\']').click();
            });
            cy.wait(TIMEOUTS.HALF_SEC);
            cy.document().then((doc) => {
                cy.wrap(doc).find('.react-select__option').contains('React Native').click();
            });
            cy.get('.modal-footer button').contains('Submit').click();
        });
        cy.get('.post__body').should('contain', 'Field refresh dialog submitted successfully!');
        cy.get('.post__body').should('contain', 'My Test Project');
        cy.get('.post__body').should('contain', 'mobile');
        cy.get('.post__body').should('contain', 'react-native');
    });
    it('MM-T2540C - Multiple refresh cycles work correctly', () => {
        cy.postMessage(`/${createdCommand.trigger} `);
        cy.get('#appsModal').should('be.visible').within(() => {
            cy.get('input[placeholder*="project name"]').type('Multi-Test Project');
            const projectTypes = [
                'Web Application',
                'Mobile App',
                'API Service',
                'Web Application',
            ];
            projectTypes.forEach((projectType) => {
                cy.get('.form-group').contains('Project Type').parent().within(() => {
                    cy.get('[id^=\'MultiInput_\']').click();
                });
                cy.wait(TIMEOUTS.HALF_SEC);
                cy.document().then((doc) => {
                    cy.wrap(doc).find('.react-select__option').contains(projectType).click();
                });
                cy.wait(TIMEOUTS.ONE_SEC);
                cy.contains('Project Name').should('be.visible');
                cy.contains('Project Type').should('be.visible');
                cy.get('input[placeholder*="project name"]').should('have.value', 'Multi-Test Project');
                cy.get('.react-select__single-value').should('contain', projectType);
                if (projectType === 'Web Application') {
                    cy.contains('Framework').should('be.visible');
                    cy.get('.form-group').should('have.length', 3);
                } else if (projectType === 'Mobile App') {
                    cy.contains('Platform').should('be.visible');
                    cy.get('.form-group').should('have.length', 3);
                } else if (projectType === 'API Service') {
                    cy.contains('Language').should('be.visible');
                    cy.get('.form-group').should('have.length', 3);
                }
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