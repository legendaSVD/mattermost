declare namespace Cypress {
    interface Chainable {
        shellFind(path: string, pattern: RegExp): Chainable;
        shellRm(option: string, file: string): Chainable;
        shellUnzip(source: string, target: string): Chainable;
    }
}