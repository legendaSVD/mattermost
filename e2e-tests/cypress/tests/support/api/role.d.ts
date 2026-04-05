declare namespace Cypress {
    interface Chainable {
        getRoleByName(name: string): Chainable<Role>;
        apiGetRolesByNames(names: string[]): Chainable<{roles: Role[]}>;
        apiPatchRole(id: string, patch: Record<string, any>): Chainable<Role>;
        apiResetRoles();
    }
}