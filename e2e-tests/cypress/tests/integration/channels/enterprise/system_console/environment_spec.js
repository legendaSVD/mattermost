import * as TIMEOUTS from '../../../../fixtures/timeouts';
describe('Environment', () => {
    before(() => {
        cy.shouldNotRunOnCloudEdition();
        cy.apiInitSetup();
    });
    it('MM-T994 - Fields editable when enabled, but not saveable until validated', () => {
        cy.apiRequireLicenseForFeature('Elasticsearch');
        cy.visit('/admin_console/environment/elasticsearch');
        cy.findByTestId('connectionUrlinput').should('be.disabled');
        cy.findByTestId('skipTLSVerificationfalse').should('be.disabled');
        cy.findByTestId('usernameinput').should('be.disabled');
        cy.findByTestId('passwordinput').should('be.disabled');
        cy.findByTestId('snifftrue').should('be.disabled');
        cy.findByTestId('snifffalse').should('be.disabled');
        cy.findByTestId('enableSearchingtrue').should('be.disabled');
        cy.findByTestId('enableSearchingfalse').should('be.disabled');
        cy.findByTestId('enableAutocompletetrue').should('be.disabled');
        cy.findByTestId('enableAutocompletefalse').should('be.disabled');
        cy.visit('/admin_console/environment/elasticsearch');
        cy.findByTestId('enableIndexingtrue').check();
        cy.findByTestId('connectionUrlinput').should('not.be.disabled');
        cy.findByTestId('skipTLSVerificationfalse').should('not.be.disabled');
        cy.findByTestId('usernameinput').should('not.be.disabled');
        cy.findByTestId('passwordinput').should('not.be.disabled');
        cy.findByTestId('snifftrue').should('not.be.disabled');
        cy.findByTestId('snifffalse').should('not.be.disabled');
        cy.get('.sidebar-section').first().click();
        cy.get('#confirmModalButton').should('be.visible').and('have.text', 'Yes, Discard').click().wait(TIMEOUTS.HALF_SEC);
        cy.get('.confirmModal').should('not.exist');
    });
});