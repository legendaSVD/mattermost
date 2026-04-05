declare namespace Cypress {
    interface Chainable {
        uiOpenProfileModal(section: string): Chainable<JQuery<HTMLElement>>;
        uiCloseAccountSettingsModal(): Chainable;
        verifyAccountNameSettings(firstname: string, lastname: string): Chainable;
        uiChangeCRTDisplaySetting(setting: string): Chainable;
        uiChangeMessageDisplaySetting(setting: string): Chainable;
    }
}