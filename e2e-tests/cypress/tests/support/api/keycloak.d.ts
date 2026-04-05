declare namespace Cypress {
    interface Chainable {
        apiKeycloakGetAccessToken(): Chainable<string>;
        apiKeycloakSaveRealm(accessToken: string, failOnStatusCode: boolean): Chainable<Response>;
        apiKeycloakGetRealm(accessToken: string, failOnStatusCode: boolean): Chainable<Response>;
        apiRequireKeycloak(): Chainable<string>;
    }
}