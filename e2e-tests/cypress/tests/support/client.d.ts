declare namespace Cypress {
    interface Chainable {
        makeClient(options?: {user: Pick<UserProfile, 'username' | 'password'>}): Chainable<Client>;
    }
}