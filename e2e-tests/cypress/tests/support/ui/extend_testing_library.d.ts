declare namespace Cypress {
    interface Chainable {
        findByRoleExtended(role: string, option: {name: string}): Chainable;
    }
}