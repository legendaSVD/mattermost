import {forEachConsoleSection, makeUserASystemRole} from './helpers';
describe('Limited console access', () => {
    const roleNames = ['system_manager', 'system_user_manager', 'system_read_only_admin'];
    const testUsers = {};
    before(() => {
        cy.shouldNotRunOnCloudEdition();
        cy.apiRequireLicense();
        Cypress._.forEach(roleNames, (roleName) => {
            cy.apiCreateUser().then(({user}) => {
                testUsers[roleName] = user;
            });
        });
    });
    it('MM-T3386 - Verify the Admin Role - System Manager -- KNOWN ISSUE: MM-42573', () => {
        const role = 'system_manager';
        makeUserASystemRole(testUsers, role);
        forEachConsoleSection(testUsers, role);
    });
    it('MM-T3388 - Verify the Admin Role - System Read Only Admin -- KNOWN ISSUE: MM-42573', () => {
        const role = 'system_read_only_admin';
        makeUserASystemRole(testUsers, role);
        forEachConsoleSection(testUsers, role);
    });
});