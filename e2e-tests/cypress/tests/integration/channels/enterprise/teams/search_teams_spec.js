import {v4 as uuidv4} from 'uuid';
const PAGE_SIZE = 10;
describe('Search teams', () => {
    before(() => {
        cy.apiRequireLicense();
    });
    beforeEach(() => {
        cy.apiAdminLogin();
        cy.visit('/admin_console/user_management/teams');
    });
    it('loads with no search text', () => {
        cy.findByPlaceholderText('Search').should('be.visible').and('have.text', '');
    });
    it('returns results', () => {
        const displayName = uuidv4();
        cy.apiCreateTeam('team-search', displayName);
        cy.findByPlaceholderText('Search').type(displayName + '{enter}');
        cy.findAllByTestId('team-display-name').contains(displayName);
    });
    it('results are paginated', () => {
        const displayName = uuidv4();
        Cypress._.times(PAGE_SIZE + 2, (i) => {
            cy.apiCreateTeam('team-search-paged-' + i, displayName + ' ' + i);
        });
        cy.findByPlaceholderText('Search').type(displayName + '{enter}');
        cy.findAllByTestId('team-display-name').should('have.length', PAGE_SIZE);
        cy.findByTitle('Next Icon').parent().should('be.enabled').click();
        cy.findAllByTestId('team-display-name').should('have.length', 2);
    });
    it('clears the results when "x" is clicked', () => {
        const displayName = uuidv4();
        cy.apiCreateTeam('team-search', displayName);
        cy.findByPlaceholderText('Search').as('searchInput').type(displayName + '{enter}');
        cy.findAllByTestId('team-display-name').should('have.length', 1);
        cy.findByTestId('clear-search').click();
        cy.get('@searchInput').should('be.visible').and('have.text', '');
        cy.findAllByTestId('team-display-name').should('have.length', PAGE_SIZE);
    });
    it('clears the results when the search term is deleted with backspace', () => {
        const displayName = uuidv4();
        cy.apiCreateTeam('team-search', displayName);
        cy.findByPlaceholderText('Search').as('searchInput').type(displayName + '{enter}');
        cy.findAllByTestId('team-display-name').should('have.length', 1);
        cy.get('@searchInput').type('{selectall}{del}');
        cy.findAllByTestId('team-display-name').should('have.length', PAGE_SIZE);
    });
});