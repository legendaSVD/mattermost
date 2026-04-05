import {AdminConfig} from '@mattermost/types/config';
const testSamlMetadataUrl = 'http://test_saml_metadata_url';
const testIdpURL = 'http://test_idp_url';
const testIdpDescriptorURL = 'http://test_idp_descriptor_url';
const getSamlMetadataErrorMessage = 'SAML Metadata URL did not connect and pull data successfully';
let config: AdminConfig;
describe('SystemConsole->SAML 2.0 - Get Metadata from Idp Flow', () => {
    before(() => {
        cy.apiRequireLicenseForFeature('SAML');
        cy.apiUpdateConfig({
            SamlSettings: {
                Enable: true,
                AssertionConsumerServiceURL: Cypress.config('baseUrl') + '/login/sso/saml',
                ServiceProviderIdentifier: Cypress.config('baseUrl') + '/login/sso/saml',
                IdpMetadataURL: '',
                IdpURL: testIdpURL,
                IdpDescriptorURL: testIdpDescriptorURL,
            },
        }).then((data) => {
            ({config} = data);
        });
        cy.visit('/admin_console/authentication/saml');
        cy.get('.admin-console__header').should('be.visible').and('have.text', 'SAML 2.0');
    });
    it('fail to fetch metadata from Idp Metadata Url', () => {
        cy.findByTestId('SamlSettings.IdpMetadataURLinput').
            scrollIntoView().should('be.visible').and('be.enabled').and('have.text', '');
        cy.get('#getSamlMetadataFromIDPButton').find('button').should('be.visible').and('be.disabled');
        cy.findByTestId('SamlSettings.IdpMetadataURLinput').
            scrollIntoView().should('be.visible').
            focus().type(testSamlMetadataUrl);
        cy.get('#getSamlMetadataFromIDPButton button').click();
        cy.get('#getSamlMetadataFromIDPButton').should('be.visible').contains(getSamlMetadataErrorMessage);
        cy.findByTestId('SamlSettings.IdpURLinput').then((elem) => {
            Cypress.$(elem).val() === config.SamlSettings.IdpURL;
        });
        cy.findByTestId('SamlSettings.IdpDescriptorURL').then((elem) => {
            Cypress.$(elem).val() === config.SamlSettings.IdpDescriptorURL;
        });
        cy.findByTestId('SamlSettings.ServiceProviderIdentifier').then((elem) => {
            Cypress.$(elem).val() === config.SamlSettings.ServiceProviderIdentifier;
        });
        cy.get('#saveSetting').click();
    });
});