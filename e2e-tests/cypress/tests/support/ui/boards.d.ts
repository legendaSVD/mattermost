declare namespace Cypress {
    interface Chainable {
        uiCreateBoard(item: string): Chainable;
        uiCreateEmptyBoard(): Chainable;
        uiCreateNewBoard: (title?: string) => Chainable;
        uiAddNewGroup: (name?: string) => Chainable;
        uiAddNewCard: (title?: string, columnIndex?: number) => Chainable;
    }
}