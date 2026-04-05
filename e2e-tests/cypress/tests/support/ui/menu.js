const SYSTEM_CONSOLE_MAIN_MENU = 'Menu Icon';
function openMenu(name, item) {
    const menu = () => cy.findByRole('button', {name}).should('be.visible');
    menu().should('be.visible').click();
    if (!item) {
        return menu();
    }
    return cy.findByRole('menu').findByText(item).scrollIntoView().should('be.visible').click();
}
function getMenu(name) {
    return cy.findByRole('button', {name}).should('be.visible');
}
Cypress.Commands.add('uiOpenSystemConsoleMainMenu', (item = '') => {
    return openMenu(SYSTEM_CONSOLE_MAIN_MENU, item);
});
Cypress.Commands.add('uiCloseSystemConsoleMainMenu', () => {
    return cy.uiGetSystemConsoleMainMenu().click();
});
Cypress.Commands.add('uiGetSystemConsoleMainMenu', () => {
    return getMenu(SYSTEM_CONSOLE_MAIN_MENU);
});
Cypress.Commands.add('uiOpenDndStatusSubMenuAndClick30Mins', () => {
    cy.uiOpenUserMenu().findByText('Do not disturb').should('be.visible').trigger('mouseover');
    cy.findByText('30 mins').should('be.visible').click({force: true});
});