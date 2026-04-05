import * as TIMEOUTS from '../../../../fixtures/timeouts';
describe('Elasticsearch system console', () => {
    before(() => {
        cy.shouldNotRunOnCloudEdition();
        cy.apiRequireLicenseForFeature('Elasticsearch');
        cy.apiUpdateConfig({
            ElasticsearchSettings: {
                EnableIndexing: true,
                EnableSearching: true,
            },
        });
        cy.visit('/admin_console/environment/elasticsearch');
        cy.get('#enableIndexingtrue').click();
        cy.get('#enableAutocompletetrue').check().should('be.checked');
        cy.get('#testConfig').find('button').click();
        cy.get('.alert-success').should('have.text', 'Test successful. Configuration saved.');
    });
    it('MM-T2519 can purge indexes', () => {
        cy.get('#purgeIndexesSection').within(() => {
            cy.contains('button', 'Purge Indexes').click();
            cy.get('.alert-success').should('have.text', 'Indexes purged successfully.');
        });
    });
    it('MM-T2520 Can perform a bulk index', () => {
        cy.contains('button', 'Index Now').click();
        cy.wait(TIMEOUTS.HALF_SEC);
        cy.get('.job-table__table').
            find('tbody > tr').
            eq(0).
            as('firstRow');
        cy.waitUntil(() => {
            return cy.get('@firstRow').then((el) => {
                return el.find('.status-icon-success').length > 0;
            });
        }
        , {
            timeout: TIMEOUTS.FIVE_MIN,
            interval: TIMEOUTS.TWO_SEC,
            errorMsg: 'Reindex did not succeed in time',
        });
        cy.get('[data-testid="jobTable"]').scrollIntoView();
        cy.get('@firstRow').
            find('.status-icon-success').
            should('be.visible').
            and('have.text', 'Success');
    });
    it('MM-T2521 Elasticsearch for autocomplete queries can be disabled', () => {
        cy.get('#enableAutocompletefalse').check().should('be.checked');
        cy.get('#saveSetting').click().wait(TIMEOUTS.TWO_SEC);
        cy.apiGetConfig().then(({config}) => {
            expect(config.ElasticsearchSettings.EnableAutocomplete).to.be.false;
        });
    });
});