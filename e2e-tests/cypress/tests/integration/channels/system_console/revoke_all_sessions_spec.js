import * as TIMEOUTS from '../../../fixtures/timeouts';
import {getAdminAccount} from '../../../support/env';
describe('System Console > User Management > Users', () => {
    const admin = getAdminAccount();
    it('MM-T940 Users - Revoke all sessions from a button in admin console', () => {
        cy.apiAdminLogin();
        cy.visit('/admin_console/user_management/users');
        cy.findByText('Revoke All Sessions').should('be.visible').click();
        cy.get('#confirmModal').should('be.visible').within(() => {
            cy.findByText('Revoke all sessions in the system').should('be.visible');
            cy.findByText('This action revokes all sessions in the system. All users will be logged out from all devices, including your session. Are you sure you want to revoke all sessions?').should('be.visible');
            cy.findByText('Cancel').should('be.visible');
            cy.findByText('Revoke All Sessions').should('be.visible');
            cy.findByText('Cancel').click();
        });
        cy.get('#confirmModal').should('not.exist');
        cy.url().should('contain', '/admin_console/user_management/users');
        cy.findByText('Revoke All Sessions').should('be.visible').click();
        cy.get('#confirmModal').should('be.visible').within(() => {
            cy.findByText('Revoke All Sessions').click();
        });
        cy.url({timeout: TIMEOUTS.HALF_MIN}).should('include', '/login');
        cy.findByText('Log in to your account').should('be.visible');
    });
    it('MM-T940-1 Users - Revoke all sessions with an API call', () => {
        cy.apiAdminLogin();
        cy.apiInitSetup({loginAfter: true}).then(({team}) => {
            cy.visit(`/${team.name}/channels/town-square`);
            cy.get('#sidebarItem_off-topic').click({force: true});
            const baseUrl = Cypress.config('baseUrl');
            cy.externalRequest({user: admin, method: 'post', baseUrl, path: 'users/sessions/revoke/all'}).then(() => {
                cy.visit(`/${team.name}/channels/town-square`);
                cy.url({timeout: TIMEOUTS.HALF_MIN}).should('include', '/login');
                cy.findByText('Log in to your account').should('be.visible');
            });
        });
    });
});