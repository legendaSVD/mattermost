import * as TIMEOUTS from '../../../fixtures/timeouts';
import {demoPlugin} from '../../../utils/plugins';
import {waitForAlertMessage} from './helpers';
describe('Plugins Management', () => {
    before(() => {
        cy.shouldNotRunOnCloudEdition();
        cy.shouldHavePluginUploadEnabled();
        cy.apiRemovePluginById(demoPlugin.id);
    });
    it('MM-T2400 Plugins Management', () => {
        cy.visit('/admin_console/plugins/plugin_management');
        const mimeType = 'application/gzip';
        cy.fixture(demoPlugin.filename, 'binary').
            then(Cypress.Blob.binaryStringToBlob).
            then((fileContent) => {
                cy.get('input[type=file]').attachFile({fileContent, fileName: demoPlugin.filename, mimeType});
            });
        cy.get('#uploadPlugin').scrollIntoView().should('be.visible').click().wait(TIMEOUTS.HALF_SEC);
        cy.findByTestId(demoPlugin.id, {timeout: TIMEOUTS.FIVE_MIN}).scrollIntoView().should('be.visible').within(() => {
            cy.findByText('Enable').should('be.visible');
            cy.findByText('Remove').should('be.visible');
        });
        verifyStatus(demoPlugin.id, 'This plugin is not enabled.');
        cy.reload();
        cy.findByTestId(demoPlugin.id, {timeout: TIMEOUTS.ONE_MIN}).scrollIntoView().should('be.visible').within(() => {
            cy.findByText('Enable').should('be.visible');
            cy.findByText('Remove').should('be.visible');
            cy.findByText('Settings').should('be.visible');
        });
        verifyStatus(demoPlugin.id, 'This plugin is not enabled.');
        cy.findByTestId(demoPlugin.id).scrollIntoView().should('be.visible').within(() => {
            cy.findByText('Enable').should('be.visible').click();
            cy.findByText('Enabling...').should('be.visible');
            cy.findByText('This plugin is starting.').should('be.visible');
        });
        verifyStatus(demoPlugin.id, 'This plugin is running.');
        cy.findByTestId(demoPlugin.id).scrollIntoView().should('be.visible').within(() => {
            cy.findByText('Disable').should('be.visible').click();
            cy.findByText('This plugin is stopping.').should('be.visible');
        });
        verifyStatus(demoPlugin.id, 'This plugin is not enabled.');
        cy.findByTestId(demoPlugin.id).scrollIntoView().
            findByText('Enable').should('be.visible');
    });
});
function verifyStatus(pluginId, message) {
    waitForAlertMessage(pluginId, message);
    cy.findByTestId(pluginId).scrollIntoView().
        findByText(message).should('be.visible');
}