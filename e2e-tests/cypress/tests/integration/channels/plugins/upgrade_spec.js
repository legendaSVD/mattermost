import * as TIMEOUTS from '../../../fixtures/timeouts';
import {demoPlugin, demoPluginOld} from '../../../utils/plugins';
import {waitForAlertMessage} from './helpers';
describe('Plugin remains enabled when upgraded', () => {
    before(() => {
        cy.shouldNotRunOnCloudEdition();
        cy.shouldHavePluginUploadEnabled();
        cy.apiUninstallAllPlugins();
        cy.visit('/admin_console/plugins/plugin_management');
        cy.get('.admin-console__header', {timeout: TIMEOUTS.ONE_MIN}).should('be.visible').and('have.text', 'Plugin Management');
    });
    it('MM-T40 Plugin remains enabled when upgraded', () => {
        const newSettings = {
            ServiceSettings: {
                EnableGifPicker: true,
            },
            FileSettings: {
                EnablePublicLink: true,
            },
        };
        cy.apiUpdateConfig(newSettings);
        const mimeType = 'application/gzip';
        cy.fixture(demoPluginOld.filename, 'binary').
            then(Cypress.Blob.binaryStringToBlob).
            then((fileContent) => {
                cy.get('input[type=file]').attachFile({fileContent, fileName: demoPluginOld.filename, mimeType});
            });
        cy.get('#uploadPlugin').scrollIntoView().should('be.visible').click().wait(TIMEOUTS.HALF_SEC);
        cy.findByText('Uploading...', {timeout: TIMEOUTS.ONE_MIN}).should('be.visible');
        waitForServerStatus(demoPluginOld.id, demoPluginOld.version, {isInstalled: true});
        cy.findByText('Upload', {timeout: TIMEOUTS.ONE_MIN}).should('be.visible');
        cy.get('#uploadPlugin', {timeout: TIMEOUTS.ONE_MIN}).should('be.disabled');
        cy.findByText(`Successfully uploaded plugin from ${demoPluginOld.filename}`);
        doTaskOnPlugin(demoPluginOld.id, () => {
            cy.waitUntil(() => cy.get('strong').scrollIntoView().should('be.visible').then((title) => {
                return title[0].innerText === 'Demo Plugin';
            }));
            cy.findByText('Enable').click();
        });
        cy.findByText(new RegExp(`${demoPluginOld.id} - ${demoPluginOld.version}`)).scrollIntoView().should('be.visible');
        cy.get('#uploadPlugin').scrollIntoView().should('be.visible');
        cy.fixture(demoPlugin.filename, 'binary').
            then(Cypress.Blob.binaryStringToBlob).
            then((fileContent) => {
                cy.get('input[type=file]').attachFile({fileContent, fileName: demoPlugin.filename, mimeType});
            });
        cy.get('#uploadPlugin').should('be.visible').click().wait(TIMEOUTS.HALF_SEC);
        cy.get('#confirmModalButton').should('be.visible').click();
        waitForServerStatus(demoPlugin.id, demoPlugin.version, {isActive: true});
        cy.findByText('Upload', {timeout: TIMEOUTS.ONE_MIN}).should('be.visible');
        cy.get('#uploadPlugin', {timeout: TIMEOUTS.ONE_MIN}).should('be.disabled');
        cy.findByText(`Successfully updated plugin from ${demoPlugin.filename}`);
        waitForAlertMessage(demoPlugin.id, 'This plugin is running.');
        cy.findByText(new RegExp(`${demoPlugin.id} - ${demoPlugin.version}`)).scrollIntoView().should('be.visible');
    });
    it('MM-T39 Disable Plugin on Removal', () => {
        const {id: pluginId, url: pluginUrl, version} = demoPlugin;
        cy.apiUploadAndEnablePlugin({url: pluginUrl, id: pluginId});
        waitForServerStatus(pluginId, version, {isActive: true});
        cy.findByTestId(pluginId).scrollIntoView().should('be.visible');
        waitForAlertMessage(pluginId, 'This plugin is running.');
        cy.apiRemovePluginById(pluginId);
        waitForServerStatus(pluginId, version, {isInstalled: false});
        cy.findByTestId(pluginId).should('not.exist');
        cy.apiInstallPluginFromUrl(demoPlugin.url, true);
        waitForServerStatus(pluginId, version, {isInstalled: true});
        cy.apiGetPluginStatus(pluginId).then((data) => {
            expect(data.isInstalled).to.be.true;
            expect(data.isActive).to.be.false;
        });
        cy.findByTestId(pluginId).scrollIntoView().should('be.visible');
        waitForAlertMessage(pluginId, 'This plugin is not enabled.');
    });
});
function doTaskOnPlugin(pluginId, taskCallback) {
    cy.findByText(/Installed Plugins/).scrollIntoView().should('be.visible');
    cy.findByTestId(pluginId).scrollIntoView().should('be.visible').within(() => {
        taskCallback();
    });
}
function waitForServerStatus(pluginId, version, state = {}) {
    const checkFn = () => {
        cy.log(`Waiting for ${pluginId}`);
        return cy.apiGetPluginStatus(pluginId, version).then((status) => {
            if (Object.hasOwn(state, 'isActive')) {
                return state.isActive === status.isActive;
            }
            if (Object.hasOwn(state, 'isInstalled')) {
                return state.isInstalled === status.isInstalled;
            }
            return false;
        });
    };
    const options = {
        timeout: TIMEOUTS.TWO_MIN,
        interval: TIMEOUTS.FIVE_SEC,
    };
    return cy.waitUntil(checkFn, options);
}