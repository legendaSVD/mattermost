import * as TIMEOUTS from '../../../fixtures/timeouts';
describe('Authentication', () => {
    before(() => {
        cy.shouldNotRunOnCloudEdition();
    });
    beforeEach(() => {
        cy.apiAdminLogin();
    });
    it('MM-T1762 - Invite Salt', () => {
        cy.visit('/admin_console/site_config/public_links');
        cy.findByText('********************************').should('be.visible');
        cy.findByText('Regenerate', {timeout: TIMEOUTS.ONE_MIN}).click();
        cy.findByText('********************************').should('not.exist');
    });
    it('MM-T1775 - Maximum Login Attempts field resets to default after saving invalid value', () => {
        cy.visit('/admin_console/authentication/password');
        cy.findByPlaceholderText('E.g.: "10"', {timeout: TIMEOUTS.ONE_MIN}).clear().type('ten');
        cy.uiSave();
        cy.findByPlaceholderText('E.g.: "10"').invoke('val').should('equal', '10');
        cy.apiGetConfig().then(({config}) => {
            expect(config.ServiceSettings.MaximumLoginAttempts).to.equal(10);
        });
    });
    it('MM-T1776 - Maximum Login Attempts field successfully saves valid change', () => {
        cy.visit('/admin_console/authentication/password');
        cy.findByPlaceholderText('E.g.: "10"', {timeout: TIMEOUTS.ONE_MIN}).clear().type('2');
        cy.uiSaveConfig();
        cy.findByPlaceholderText('E.g.: "10"').invoke('val').should('equal', '2');
        cy.apiGetConfig().then(({config}) => {
            expect(config.ServiceSettings.MaximumLoginAttempts).to.equal(2);
        });
    });
});