import {hexToRgbArray, rgbArrayToString} from '../../../../../utils';
describe('Custom Theme - Sidebar Styles', () => {
    const themeRgbColor = {};
    before(() => {
        cy.apiInitSetup({loginAfter: true}).then(({offTopicUrl}) => {
            cy.visit(offTopicUrl);
            cy.uiOpenSettingsModal('Display');
            cy.get('#themeTitle').scrollIntoView().click();
            cy.uiGetRadioButton('Custom Theme').click();
            cy.findByText('Sidebar Styles').scrollIntoView().click({force: true});
        });
    });
    it('MM-T3853_1 Should change custom sidebar styles on click to color picker', () => {
        const testCases = [
            {key: 0, name: 'Sidebar BG', themeId: 'sidebarBg'},
            {key: 1, name: 'Sidebar Text', themeId: 'sidebarText'},
            {key: 2, name: 'Sidebar Header BG', themeId: 'sidebarHeaderBg'},
            {key: 3, name: 'Team Sidebar BG', themeId: 'sidebarTeamBarBg'},
            {key: 4, name: 'Sidebar Header Text', themeId: 'sidebarHeaderTextColor'},
            {key: 5, name: 'Sidebar Unread Text', themeId: 'sidebarUnreadText'},
            {key: 6, name: 'Sidebar Text Hover BG', themeId: 'sidebarTextHoverBg'},
            {key: 7, name: 'Sidebar Text Active Border', themeId: 'sidebarTextActiveBorder'},
            {key: 8, name: 'Sidebar Text Active Color', themeId: 'sidebarTextActiveColor'},
            {key: 9, name: 'Online Indicator', themeId: 'onlineIndicator'},
            {key: 10, name: 'Away Indicator', themeId: 'awayIndicator'},
            {key: 11, name: 'Do Not Disturb Indicator', themeId: 'dndIndicator'},
            {key: 12, name: 'Mention Jewel BG', themeId: 'mentionBg'},
            {key: 13, name: 'Mention Jewel Text', themeId: 'mentionColor'},
        ];
        Cypress._.forEach(testCases, (testCase) => {
            cy.get('.input-group-addon').eq(testCase.key).scrollIntoView().click({force: true});
            cy.get('.color-popover').should('be.visible').click(15, 40 + testCase.key);
            cy.get(`#${testCase.themeId}-inputColorValue`).scrollIntoView().should('be.visible').invoke('attr', 'value').then((hexColor) => {
                themeRgbColor[testCase.themeId] = hexToRgbArray(hexColor);
                cy.get('.color-icon').eq(testCase.key).should('have.css', 'background-color', rgbArrayToString(themeRgbColor[testCase.themeId]));
                cy.get('#pasteBox').scrollIntoView().should('contain', `"${testCase.themeId}":"${hexColor.toLowerCase()}"`);
            });
        });
    });
    it('MM-T3853_2 Should observe color change in Settings modal before saving', () => {
        cy.get('.settings-links').should('have.css', 'background-color', 'rgba(63, 67, 80, 0.04)');
        cy.get('#displayButton').should('have.css', 'color', 'rgb(28, 88, 217)');
        cy.get('#accountSettingsHeader').should('have.css', 'background', 'rgba(0, 0, 0, 0) none repeat scroll 0% 0% / auto padding-box border-box');
        cy.get('#accountSettingsModalLabel').should('have.css', 'color', 'rgb(63, 67, 80)');
        cy.uiSaveAndClose();
    });
    it('MM-T3853_3 Should take effect each custom color in Channel View', () => {
        cy.get('#unreadIndicatorBottom').should('have.css', 'background-color', rgbArrayToString(themeRgbColor.mentionBg));
        cy.get('#unreadIndicatorBottom').should('have.css', 'color', rgbArrayToString(themeRgbColor.mentionColor));
        cy.uiOpenUserMenu('Online');
        cy.uiGetSetStatusButton().find('svg').should('have.css', 'color', rgbArrayToString(themeRgbColor.onlineIndicator));
        cy.uiOpenUserMenu('Away');
        cy.uiGetSetStatusButton().find('svg').should('have.css', 'color', rgbArrayToString(themeRgbColor.awayIndicator));
        cy.uiOpenDndStatusSubMenuAndClick30Mins();
        cy.uiGetSetStatusButton().find('svg').should('have.css', 'color', rgbArrayToString(themeRgbColor.dndIndicator));
    });
});