import * as TIMEOUTS from '../../../fixtures/timeouts';
describe('Authentication', () => {
    before(() => {
        cy.apiUpdateConfig({
            TeamSettings: {
                EnableOpenServer: false,
            },
        });
        cy.apiLogout();
        cy.visit('/');
    });
    it('MM-T1760 - Enable Open Server false: Create account link is hidden', () => {
        cy.findByText('Don\'t have an account?', {timeout: TIMEOUTS.TEN_SEC}).should('not.exist');
    });
});