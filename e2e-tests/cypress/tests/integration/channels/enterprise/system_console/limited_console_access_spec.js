import {forEachConsoleSection, makeUserASystemRole} from './helpers';
describe('Limited console access', () => {
    const roleNames = ['system_manager', 'system_user_manager', 'system_read_only_admin'];
    const testUsers = {};
    before(() => {
        cy.apiRequireLicense();
        Cypress._.forEach(roleNames, (roleName) => {
            cy.apiCreateUser().then(({user}) => {
                testUsers[roleName] = user;
            });
        });
    });
    it('MM-T3387 - Verify the Admin Role - System User Manager', () => {
        const role = 'system_user_manager';
        makeUserASystemRole(testUsers, role);
        forEachConsoleSection(testUsers, role);
    });
});