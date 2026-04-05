declare namespace Cypress {
    interface Chainable {
        reload(forceReload: boolean, options?: Partial<Loggable & Timeoutable>, duration?: number): Chainable;
        visit(url: string, options?: Partial<Cypress.VisitOptions>, duration?: number): Chainable;
        typeWithForce(text: string, options?: Omit<Partial<TypeOptions>, 'force'>): Chainable;
    }
}