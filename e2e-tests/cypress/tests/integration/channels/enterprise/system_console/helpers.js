import accessRules from '../../../../fixtures/system-roles-console-access';
import disabledTests from '../../../../fixtures/console-example-inputs';
import * as TIMEOUTS from '../../../../fixtures/timeouts';
function noAccessFunc(section) {
    cy.findByTestId(section).should('not.exist');
}
function readOnlyFunc(section) {
    cy.findByTestId(section).should('exist');
    checkInputsShould('be.disabled', section);
}
function readWriteFunc(section) {
    cy.findByTestId(section).should('exist');
    checkInputsShould('be.enabled', section);
}
function checkInputsShould(shouldString, section) {
    const {disabledInputs} = disabledTests.find((item) => item.section === section);
    Cypress._.forEach(disabledInputs, ({path, selector}) => {
        if (path.length && selector.length) {
            cy.visit(path, {timeout: TIMEOUTS.HALF_MIN});
            cy.findByTestId(selector, {timeout: TIMEOUTS.ONE_MIN}).should(shouldString);
        }
    });
}
export function makeUserASystemRole(testUsers, role) {
    cy.apiAdminLogin();
    cy.visit('/admin_console/user_management/system_roles');
    cy.get('.admin-console__header').within(() => {
        cy.findByText('Delegated Granular Administration', {timeout: TIMEOUTS.ONE_MIN}).should('exist').and('be.visible');
    });
    cy.findByTestId(`${role}_edit`).click();
    cy.findByRole('button', {name: 'Add People'}).click().wait(TIMEOUTS.HALF_SEC);
    cy.findByRole('combobox', {name: 'Search for people'}).typeWithForce(`${testUsers[role].email}`);
    cy.get('#multiSelectList').should('be.visible').children().first().click({force: true});
    cy.findByRole('button', {name: 'Add'}).click().wait(TIMEOUTS.HALF_SEC);
    cy.findByRole('button', {name: 'Save'}).click().wait(TIMEOUTS.HALF_SEC);
}
export function forEachConsoleSection(testUsers, roleName) {
    const ACCESS_NONE = 'none';
    const ACCESS_READ_ONLY = 'read';
    const ACCESS_READ_WRITE = 'read+write';
    const user = testUsers[roleName];
    cy.apiLogin(user);
    cy.visit('/admin_console');
    cy.get('.admin-sidebar', {timeout: TIMEOUTS.ONE_MIN}).should('be.visible');
    accessRules.forEach((rule) => {
        const {section} = rule;
        const access = rule[roleName];
        switch (access) {
        case ACCESS_NONE:
            noAccessFunc(section);
            break;
        case ACCESS_READ_ONLY:
            readOnlyFunc(section);
            break;
        case ACCESS_READ_WRITE:
            readWriteFunc(section);
            break;
        }
    });
}