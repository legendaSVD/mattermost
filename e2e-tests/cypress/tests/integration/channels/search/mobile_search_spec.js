function openSidebarMenu() {
    cy.get('button.menu-toggle').click();
    cy.get('#sidebar-menu').should('be.visible');
}
function verifyLoadingSpinnerIsGone() {
    cy.get('#sidebar-right').should('be.visible');
    cy.get('#loadingSpinner').should('not.exist');
}
describe('Mobile Search', () => {
    let townsquareLink;
    before(() => {
        cy.apiInitSetup({loginAfter: true}).then(({team}) => {
            townsquareLink = `/${team.name}/channels/town-square`;
        });
    });
    beforeEach(() => {
        cy.viewport('iphone-6');
        cy.visit(townsquareLink);
    });
    it('Opening the Recent Mentions eventually loads the results', () => {
        openSidebarMenu();
        cy.get('#recentMentions').click();
        verifyLoadingSpinnerIsGone();
    });
    it('Opening the Saved Posts eventually loads the results', () => {
        openSidebarMenu();
        cy.get('#flaggedPosts').click();
        verifyLoadingSpinnerIsGone();
    });
    it('Searching eventually loads the results', () => {
        cy.get('button.navbar-search').click();
        cy.get('#sbrSearchBox').should('be.visible');
        cy.get('#sbrSearchBox').type('test').type('{enter}');
        verifyLoadingSpinnerIsGone();
    });
    it('MM-64681 should be able to autocomplete users and channels in mobile view', () => {
        cy.get('button.navbar-search').click();
        cy.get('#sbrSearchBox').should('be.visible');
        cy.get('#sbrSearchBox').type('from:');
        cy.get('[role="listbox"]').get('[role="option"]').should('be.visible').and('contain.text', 'sysadmin');
        cy.get('[role="option"]').contains('sysadmin').click();
        cy.get('[role="listbox"]').should('not.exist');
        cy.get('#sbrSearchBox').should('have.value', 'from:sysadmin ');
        cy.get('#sbrSearchBox').type('in:');
        cy.get('[role="listbox"]').get('[role="option"]').should('be.visible');
        cy.get('[role="option"]').contains('Off-Topic').click();
        cy.get('[role="listbox"]').should('not.exist');
        cy.get('#sbrSearchBox').should('have.value', 'from:sysadmin in:off-topic ');
    });
});