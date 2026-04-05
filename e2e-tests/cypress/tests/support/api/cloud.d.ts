declare namespace Cypress {
    interface Chainable {
        apiGetCloudProducts(): Chainable<{products: Product[]}>;
        apiGetCloudSubscription(): Chainable<{subscription: Subscription}>;
    }
}