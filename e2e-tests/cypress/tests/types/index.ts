export type ChainableT<T =any> = Cypress.Chainable<T>;
export type ResponseT<T =any> = ChainableT<Cypress.Response<T>>;