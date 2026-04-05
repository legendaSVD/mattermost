declare namespace Cypress {
    interface Chainable {
        uiGetToolTip(text: string): Chainable;
    }
}