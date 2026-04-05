declare namespace Cypress {
    interface Chainable {
        uiLogin(user: UserProfile): Chainable;
    }
}