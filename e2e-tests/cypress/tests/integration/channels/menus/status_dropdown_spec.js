import theme from '../../../fixtures/theme.json';
describe('Status dropdown menu', () => {
    const statusTestCases = [
        {text: 'Online', className: 'userAccountMenu_onlineMenuItem_icon'},
        {text: 'Away', className: 'userAccountMenu_awayMenuItem_icon'},
        {text: 'Do not disturb', className: 'userAccountMenu_dndMenuItem_icon'},
        {text: 'Offline', className: 'userAccountMenu_offlineMenuItem_icon'},
    ];
    before(() => {
        cy.apiInitSetup({loginAfter: true}).then(({offTopicUrl}) => {
            cy.visit(offTopicUrl);
            cy.postMessage('hello');
        });
    });
    beforeEach(() => {
        cy.get('body').click();
    });
    it('MM-T2927_1 Should show all available statuses with their icons', () => {
        cy.uiOpenUserMenu().as('userMenu');
        statusTestCases.forEach((tc) => {
            cy.uiGetStatusMenu().within(() => {
                cy.findByText(tc.text).should('be.visible');
                cy.get('svg').filter(`.${tc.className}`).should('have.length', 1);
            });
        });
    });
    it('MM-T2927_2 Should select each status, and have the user\'s active status change', () => {
        stepThroughStatuses(statusTestCases);
    });
    it('MM-T2927_3 Icons are visible in dark mode', () => {
        cy.apiSaveThemePreference(JSON.stringify(theme.dark));
        stepThroughStatuses(statusTestCases);
        cy.apiSaveThemePreference(JSON.stringify(theme.default));
    });
    it('MM-T2927_4 "Set a Custom Header Status" is clickable', () => {
        cy.uiOpenUserMenu().as('userMenu');
        cy.get('@userMenu').findByText('Set custom status').should('have.css', 'cursor', 'pointer');
    });
    it('MM-T2927_5 When custom status is disabled, status menu is displayed when status icon is clicked', () => {
        cy.apiAdminLogin();
        cy.visit('/');
        cy.apiUpdateConfig({TeamSettings: {EnableCustomUserStatuses: false}});
        cy.uiOpenUserMenu();
    });
    it('MM-T4914 Profile menu header is clickable, opens Profile settings', () => {
        cy.uiOpenUserMenu().within(() => {
            cy.get('li').first().should('have.css', 'cursor', 'pointer').click();
        });
        cy.findByRole('dialog', {name: 'Profile'}).should('be.visible');
    });
});
function stepThroughStatuses(statusTestCases = []) {
    cy.get('#postListContent').should('be.visible');
    statusTestCases.forEach((tc) => {
        if (tc.text === 'Do not disturb') {
            cy.uiOpenDndStatusSubMenuAndClick30Mins();
        } else {
            cy.uiOpenUserMenu(tc.text);
        }
        cy.uiGetSetStatusButton().within(() => {
            cy.get('svg').filter(`.${tc.className}`).should('have.length', 1);
        });
    });
}