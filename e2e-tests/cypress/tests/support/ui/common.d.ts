declare namespace Cypress {
    interface Chainable {
        uiSave(): Chainable;
        uiCancel(): Chainable;
        uiClose(): Chainable;
        uiSaveAndClose(): Chainable;
        uiGetButton(label: string): Chainable;
        uiSaveButton(): Chainable;
        uiCancelButton(): Chainable;
        uiCloseButton(): Chainable;
        uiGetRadioButton(): Chainable;
        uiGetHeading(headingText: string): Chainable;
        uiGetTextbox(text: string): Chainable;
    }
}