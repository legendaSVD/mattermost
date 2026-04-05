import * as TIMEOUTS from '../../../../fixtures/timeouts';
describe('System console', () => {
    before(() => {
        cy.shouldNotRunOnCloudEdition();
        cy.apiRequireLicense();
    });
    it('MM-T897_1 - Focus should be in System Console search box on opening System Console or refreshing pages in System Console', () => {
        const pageIds = ['reporting\\/system_analytics', 'reporting\\/team_statistics', 'reporting\\/server_logs', 'user_management\\/users', 'user_management\\/teams'];
        cy.visit('/admin_console');
        cy.focused().should('have.id', 'adminSidebarFilter');
        cy.wait(TIMEOUTS.ONE_SEC);
        pageIds.forEach((id) => {
            cy.get(`#${id}`).click();
            cy.focused().should('not.have.id', 'adminSidebarFilter');
            cy.reload();
            cy.focused().should('have.id', 'adminSidebarFilter');
            cy.wait(TIMEOUTS.ONE_SEC);
        });
    });
    it('MM-T897_2 - System Console menu footer should not cut off at the bottom', () => {
        cy.visit('/admin_console');
        cy.findByTestId('experimental.feature_flags').scrollIntoView().click();
    });
    it('MM-T1634 - Search box should remain visible / in the header as you scroll down the settings list in the left-hand-side', () => {
        cy.visit('/admin_console');
        cy.findByTestId('experimental.feature_flags').scrollIntoView().click();
        cy.get('#adminSidebarFilter').should('be.visible').click();
    });
});