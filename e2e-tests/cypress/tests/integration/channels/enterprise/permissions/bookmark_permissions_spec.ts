import * as TIMEOUTS from '../../../../fixtures/timeouts';
const deleteExistingTeamOverrideSchemes = () => {
    cy.apiGetSchemes('team').then(({schemes}) => {
        schemes.forEach((scheme) => {
            cy.apiDeleteScheme(scheme.id);
        });
    });
};
const checkChannelBookmarksPermissionsAreVisibleAndSet = () => {
    const permissionRowIds = ['all_users-public_channel-manage_public_channel_bookmarks-checkbox',
        'all_users-private_channel-manage_private_channel_bookmarks-checkbox'];
    permissionRowIds.forEach((id) => {
        cy.findByTestId(id).then((el) => {
            expect(el.hasClass('checked')).to.be.true;
        });
    });
};
describe('Revoke Bookmarks Permissions', () => {
    before(() => {
        cy.apiRequireLicense();
        cy.apiInitSetup();
        deleteExistingTeamOverrideSchemes();
    });
    beforeEach(() => {
        cy.apiLogout();
        cy.apiAdminLogin();
        cy.apiResetRoles();
    });
    it('Channel Bookmarks permissions should be visible and set in the system scheme', () => {
        cy.apiAdminLogin();
        cy.visit('/admin_console/user_management/permissions');
        cy.findByTestId('systemScheme-link').should('be.visible').click().wait(TIMEOUTS.HALF_SEC);
        checkChannelBookmarksPermissionsAreVisibleAndSet();
    });
    it('Channel Bookmarks permissions should be visible and set in a custom scheme', () => {
        cy.apiAdminLogin();
        cy.visit('/admin_console/user_management/permissions');
        cy.findByTestId('team-override-schemes-link').should('be.visible').click().wait(TIMEOUTS.HALF_SEC);
        cy.get('#scheme-name').should('be.visible').type('custom test schema');
        cy.get('#scheme-description').type('description');
        cy.get('#saveSetting').click().wait(TIMEOUTS.TWO_SEC);
        cy.findByTestId('custom test schema-edit').should('be.visible').click().wait(TIMEOUTS.HALF_SEC);
        checkChannelBookmarksPermissionsAreVisibleAndSet();
    });
});