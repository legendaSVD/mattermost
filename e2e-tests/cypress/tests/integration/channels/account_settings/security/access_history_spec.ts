describe('Profile > Security > View Access History', () => {
    before(() => {
        cy.apiInitSetup({loginAfter: true}).then(({offTopicUrl}) => {
            cy.visit(offTopicUrl);
        });
    });
    beforeEach(() => {
        cy.uiOpenProfileModal('Security');
        cy.get('#securityButton').should('be.visible');
        cy.get('#securityButton').click();
    });
    it('MM-T2087 View Access History', () => {
        cy.findByText('View Access History').should('be.visible').click();
        cy.get('#accessHistoryModalLabel').should('be.visible');
        cy.get('.modal-body table').should('be.visible');
        cy.get('.modal-body table thead tr th span').should('be.visible').should('have.length', 4);
        cy.get('.modal-body table thead tr th span').eq(0).should('be.visible').should('contain', 'Timestamp');
        cy.get('.modal-body table thead tr th span').eq(1).should('be.visible').should('contain', 'Action');
        cy.get('.modal-body table thead tr th span').eq(2).should('be.visible').should('contain', 'IP Address');
        cy.get('.modal-body table thead tr th span').eq(3).should('be.visible').should('contain', 'Session ID');
        cy.findByTestId('auditTableBody').should('be.visible').should('not.empty');
    });
});