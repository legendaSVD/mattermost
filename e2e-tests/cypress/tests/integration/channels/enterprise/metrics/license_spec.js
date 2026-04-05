import {checkMetrics, toggleMetricsOn} from './helper';
describe('Metrics > License', () => {
    before(() => {
        cy.shouldNotRunOnCloudEdition();
        cy.apiRequireLicense();
        toggleMetricsOn();
    });
    it('should enable metrics in BUILD_NUMBER == dev environments', () => {
        cy.apiGetConfig(true).then(({config}) => {
            if (config.BuildNumber !== 'dev') {
                Cypress.log({name: 'Metrics License', message: `Skipping test since BUILD_NUMBER = ${config.BuildNumber}`});
                return;
            }
            checkMetrics(200);
        });
    });
    it('should enable metrics in BUILD_NUMBER != dev environments', () => {
        cy.apiGetConfig(true).then(({config}) => {
            if (config.BuildNumber === 'dev') {
                Cypress.log({name: 'Metrics License', message: `Skipping test since BUILD_NUMBER = ${config.BuildNumber}`});
                return;
            }
            checkMetrics(200);
        });
    });
});