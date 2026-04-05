import * as TIMEOUTS from '../../../fixtures/timeouts';
import {gitlabPlugin} from '../../../utils/plugins';
describe('If plugins fail to start, they can be disabled', () => {
    before(() => {
        cy.shouldNotRunOnCloudEdition();
        cy.shouldHavePluginUploadEnabled();
        cy.apiRemovePluginById(gitlabPlugin.id);
        cy.visit('/admin_console/plugins/plugin_management');
        cy.get('.admin-console__header', {timeout: TIMEOUTS.ONE_MIN}).should('be.visible').and('have.text', 'Plugin Management');
    });
    it('MM-T2391 If plugins fail to start, they can be disabled', () => {
        const mimeType = 'application/gzip';
        cy.fixture(gitlabPlugin.filename, null).
            then(Cypress.Blob.arrayBufferToBlob).
            then((fileContent) => {
                cy.get('input[type=file]').attachFile({fileContent, fileName: gitlabPlugin.filename, mimeType});
            });
        cy.get('#uploadPlugin').scrollIntoView().should('be.visible').click().wait(TIMEOUTS.HALF_SEC);
        cy.findByText('Uploading...', {timeout: TIMEOUTS.ONE_MIN}).should('be.visible');
        cy.findByText('Upload', {timeout: TIMEOUTS.ONE_MIN}).should('be.visible');
        cy.get('#uploadPlugin').and('be.disabled');
        cy.findByTestId(gitlabPlugin.id).scrollIntoView().should('be.visible').within(() => {
            cy.waitUntil(() => cy.get('strong').scrollIntoView().should('be.visible').then((title) => {
                return title[0].innerText === 'GitLab';
            }));
            cy.findByText('Enable').click();
            cy.findByText('This plugin failed to start. must have a GitLab oauth client id').should('be.visible');
            cy.findByText('Disable').click();
            cy.findByText('This plugin is not enabled.').should('be.visible');
        });
    });
});