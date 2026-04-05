declare namespace Cypress {
    interface Chainable {
        apiGetSchemes(scope: string): Chainable<{schemes: Scheme[]}>;
        apiDeleteScheme(schemeId: string): Chainable<Response>;
    }
}