export function changeDesktopNotificationAs(category) {
    cy.uiOpenSettingsModal().within(() => {
        cy.findByText('Desktop and mobile notifications').should('be.visible').click();
        cy.get('#sendDesktopNotificationsSection').should('exist').within(() => {
            if (category === 'all') {
                cy.findByText('All new messages').should('be.visible').click({force: true});
            } else if (category === 'mentions') {
                cy.findByText('Mentions, direct messages, and group messages').should('be.visible').click({force: true});
            } else if (category === 'nothing') {
                cy.findByText('Nothing').should('be.visible').click({force: true});
            }
        });
        cy.uiSaveAndClose();
    });
}
export function changeTeammateNameDisplayAs(category) {
    cy.uiOpenSettingsModal('Display').within(() => {
        cy.findByText('Teammate Name Display').click();
        cy.get(category).check();
        cy.uiSaveAndClose();
    });
}