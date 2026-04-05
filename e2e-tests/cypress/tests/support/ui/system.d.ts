declare namespace Cypress {
    interface Chainable {
        uiCheckLicenseExists(): Chainable;
        uiResetPermissionsToDefault(): Chainable;
        uiSaveConfig(): Chainable;
    }
}