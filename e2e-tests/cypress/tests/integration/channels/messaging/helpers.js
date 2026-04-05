export function verifyDraftIcon(name, isVisible) {
    cy.uiGetLhsSection('CHANNELS').find(`#sidebarItem_${name}`).
        should('be.visible').
        findByTestId('draftIcon').
        should(isVisible ? 'be.visible' : 'not.exist');
}