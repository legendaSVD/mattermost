declare namespace Cypress {
    interface Chainable {
        apiGetIncomingWebhook(hookId: string): Chainable<Record<string, any>>;
        apiGetOutgoingWebhook(hookId: string): Chainable<Record<string, any>>;
    }
}