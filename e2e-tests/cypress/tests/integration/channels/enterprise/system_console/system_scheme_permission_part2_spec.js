import * as TIMEOUTS from '../../../../fixtures/timeouts';
describe('System Scheme', () => {
    before(() => {
        cy.apiRequireLicense();
    });
    beforeEach(() => {
        cy.apiResetRoles();
        cy.visit('/admin_console/user_management/permissions');
    });
    it('MM-T2862 Default permissions set inherited from system scheme', () => {
        cy.findByTestId('systemScheme-link').should('be.visible').click().wait(TIMEOUTS.HALF_SEC);
        cy.findByTestId('all_users-public_channel-create_public_channel-checkbox').should('have.class', 'checked').click();
        cy.findByTestId('all_users-private_channel-create_private_channel-checkbox').should('have.class', 'checked').click();
        cy.findByTestId('all_users-teams-invite_guest-checkbox').should('not.have.class', 'checked').click();
        cy.get('#saveSetting').click().wait(TIMEOUTS.TWO_SEC);
        cy.visit('/admin_console/user_management/permissions');
        cy.findByTestId('team-override-schemes-link').should('be.visible').click().wait(TIMEOUTS.HALF_SEC);
        cy.findByTestId('all_users-public_channel-create_public_channel-checkbox').should('not.have.class', 'checked');
        cy.findByTestId('all_users-private_channel-create_private_channel-checkbox').should('not.have.class', 'checked');
        cy.findByTestId('all_users-teams_team_scope-invite_guest-checkbox').should('have.class', 'checked');
    });
    it('MM-T2863 Reset system scheme defaults will revert permissions to defaults', () => {
        cy.findByTestId('systemScheme-link').should('be.visible').click().wait(TIMEOUTS.HALF_SEC);
        cy.findByTestId('resetPermissionsToDefault').scrollIntoView().should('be.visible').click().wait(TIMEOUTS.HALF_SEC);
        cy.get('#confirmModalButton').click().wait(TIMEOUTS.TWO_SEC);
        cy.findByTestId('guests-guest_create_private_channel-checkbox').should('not.have.class', 'checked').click();
        cy.findByTestId('all_users-public_channel-create_public_channel-checkbox').should('have.class', 'checked').click();
        cy.findByTestId('all_users-private_channel-create_private_channel-checkbox').should('have.class', 'checked').click();
        cy.get('#saveSetting').click().wait(TIMEOUTS.HALF_SEC);
        cy.visit('/admin_console/user_management/permissions');
        cy.findByTestId('systemScheme-link').should('be.visible').click().wait(TIMEOUTS.HALF_SEC);
        cy.findByTestId('guests-guest_create_private_channel-checkbox').should('have.class', 'checked');
        cy.findByTestId('all_users-public_channel-create_public_channel-checkbox').should('not.have.class', 'checked');
        cy.findByTestId('all_users-private_channel-create_private_channel-checkbox').should('not.have.class', 'checked');
        cy.findByTestId('resetPermissionsToDefault').scrollIntoView().should('be.visible').click().wait(TIMEOUTS.HALF_SEC);
        cy.get('#confirmModalButton').scrollIntoView().click().wait(TIMEOUTS.HALF_SEC);
        cy.get('#saveSetting').click().wait(TIMEOUTS.TWO_SEC);
        cy.reload();
        cy.findByTestId('guests-guest_create_private_channel-checkbox').should('not.have.class', 'checked');
        cy.findByTestId('all_users-public_channel-create_public_channel-checkbox').should('have.class', 'checked');
        cy.findByTestId('all_users-private_channel-create_private_channel-checkbox').should('have.class', 'checked');
    });
});