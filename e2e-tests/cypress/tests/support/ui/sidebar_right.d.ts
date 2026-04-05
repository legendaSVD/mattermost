declare namespace Cypress {
    interface Chainable {
        uiGetRHS(option?: Record<string, boolean>): Chainable;
        uiCloseRHS(): Chainable;
        uiExpandRHS(): Chainable;
        isExpanded(): Chainable;
        uiGetReply(): Chainable;
        uiReply(): Chainable;
        uiGetRHSSearchContainer(option: Record<string, boolean>): Chainable;
        uiGetFileFilterButton(): Chainable;
        uiGetFileFilterMenu(): Chainable;
        uiOpenFileFilterMenu(): Chainable;
    }
}