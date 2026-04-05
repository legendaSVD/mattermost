declare namespace Cypress {
    interface Chainable {
        apiDeleteAllCustomRetentionPolicies(): Chainable;
        apiPostWithCreateDate(channelId: string, message: string, token: string, createat: number): Chainable;
    }
}