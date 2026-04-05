Cypress.Commands.add('uiOpenProfileModal', (section = '') => {
    cy.uiOpenUserMenu('Profile');
    const profileSettingsModal = () => cy.findByRole('dialog', {name: 'Profile'}).should('be.visible');
    if (!section) {
        return profileSettingsModal();
    }
    cy.findByRoleExtended('tab', {name: section}).should('be.visible').click();
    return profileSettingsModal();
});
Cypress.Commands.add('verifyAccountNameSettings', (firstname, lastname) => {
    cy.uiOpenProfileModal('Profile Settings');
    cy.get('#nameDesc').should('have.text', `${firstname} ${lastname}`);
    cy.uiClose();
});
Cypress.Commands.add('uiChangeGenericDisplaySetting', (setting, option) => {
    cy.uiOpenSettingsModal('Display');
    cy.get(setting).scrollIntoView();
    cy.get(setting).click();
    cy.get('.section-max').scrollIntoView();
    cy.get(option).check().should('be.checked');
    cy.uiSaveAndClose();
});
Cypress.Commands.add('uiChangeMessageDisplaySetting', (setting = 'STANDARD') => {
    const SETTINGS = {STANDARD: '#message_displayFormatA', COMPACT: '#message_displayFormatB'};
    cy.uiChangeGenericDisplaySetting('#message_displayTitle', SETTINGS[setting]);
});
Cypress.Commands.add('uiChangeCRTDisplaySetting', (setting = 'OFF') => {
    const SETTINGS = {
        ON: '#collapsed_reply_threadsFormatA',
        OFF: '#collapsed_reply_threadsFormatB',
    };
    cy.uiChangeGenericDisplaySetting('#collapsed_reply_threadsTitle', SETTINGS[setting]);
});