declare namespace Cypress {
    interface Chainable {
        uiGetMFASecret(userId: string): Chainable<string>;
    }
}