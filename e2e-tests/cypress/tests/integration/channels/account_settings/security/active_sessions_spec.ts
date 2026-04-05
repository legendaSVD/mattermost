import * as TIMEOUTS from '../../../../fixtures/timeouts';
describe('Profile > Security > View and Log Out of Active Sessions', () => {
    const platforms = [
        'Linux',
        'Macintosh',
        'Windows',
        'Native Desktop App',
        'iPhone Native App',
        'Android Native App',
        'iPhone Native Classic App',
        'Android Native Classic App',
    ];
    const platformRegex = new RegExp(`${platforms.join('|')}`, 'g');
    let testUser: Cypress.UserProfile;
    before(() => {
        cy.apiInitSetup({loginAfter: true}).then(({offTopicUrl, user}) => {
            testUser = user;
            cy.visit(offTopicUrl);
            cy.uiOpenProfileModal('Security');
            cy.get('#securityButton').should('be.visible');
            cy.get('#securityButton').click();
        });
    });
    it('MM-T2088 View and Logout of Active Sessions (Se)', () => {
        cy.findByText('View and Log Out of Active Sessions').should('be.visible').click();
        cy.get('.report__platform').contains(platformRegex);
        cy.get('.report__info a').should('be.visible').and('have.text', 'More info').click();
        cy.get('.report__info').should('contain', 'Last activity:').
            and('contain', 'First time active:').
            and('contain', 'OS:').
            and('contain', 'Browser:').
            and('contain', 'Session ID:');
        cy.findByText('Log Out').click();
        cy.uiLogin(testUser);
        cy.get('#channel_view', {timeout: TIMEOUTS.ONE_MIN}).should('be.visible');
    });
});