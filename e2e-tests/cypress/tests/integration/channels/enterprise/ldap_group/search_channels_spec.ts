import {getRandomId} from '../../../../utils';
describe('Search channels', () => {
    const PAGE_SIZE = 10;
    let testTeamId;
    before(() => {
        cy.apiRequireLicenseForFeature('LDAPGroups');
        cy.apiUpdateConfig({LdapSettings: {Enable: true}});
        cy.apiInitSetup().then(({team}) => {
            testTeamId = team.id;
        });
    });
    beforeEach(() => {
        cy.visit('/admin_console/user_management/channels');
    });
    it('loads with no search text', () => {
        cy.get('.DataGrid_searchBar').within(() => {
            cy.findByPlaceholderText('Search').should('be.visible').and('have.text', '');
        });
    });
    it('returns results', () => {
        const displayName = getRandomId();
        cy.apiCreateChannel(testTeamId, 'channel-search', displayName);
        cy.get('.DataGrid_searchBar').within(() => {
            cy.findByPlaceholderText('Search').type(displayName + '{enter}');
        });
        cy.findAllByTestId('channel-display-name').contains(displayName);
    });
    it('results are paginated', () => {
        const displayName = getRandomId();
        for (let i = 0; i < PAGE_SIZE + 2; i++) {
            cy.apiCreateChannel(testTeamId, 'channel-search-paged-' + i, displayName + ' ' + i);
        }
        cy.get('.DataGrid_searchBar').within(() => {
            cy.findByPlaceholderText('Search').type(displayName + '{enter}');
        });
        cy.findAllByTestId('channel-display-name').should('have.length', PAGE_SIZE);
        cy.get('.DataGrid_footer').should('have.text', '1 - 10 of 12').within(() => {
            cy.get('.next').should('be.enabled').click();
        });
        cy.findAllByTestId('channel-display-name').should('have.length', 2);
    });
    it('clears the results when "x" is clicked', () => {
        const displayName = getRandomId();
        cy.apiCreateChannel(testTeamId, 'channel-search', displayName);
        cy.get('.DataGrid_searchBar').within(() => {
            cy.findByPlaceholderText('Search').as('searchInput').type(displayName + '{enter}');
        });
        cy.findAllByTestId('channel-display-name').should('have.length', 1);
        cy.findByTestId('clear-search').click();
        cy.get('@searchInput').should('be.visible').and('have.text', '');
        cy.findAllByTestId('channel-display-name').should('have.length', PAGE_SIZE);
    });
    it('clears the results when the search term is deleted with backspace', () => {
        const displayName = getRandomId();
        cy.apiCreateChannel(testTeamId, 'channel-search', displayName);
        cy.get('.DataGrid_searchBar').within(() => {
            cy.findByPlaceholderText('Search').as('searchInput').type(displayName + '{enter}');
        });
        cy.findAllByTestId('channel-display-name').should('have.length', 1);
        cy.get('@searchInput').type('{selectall}{del}');
        cy.findAllByTestId('channel-display-name').should('have.length', PAGE_SIZE);
    });
});