import {hexToRgbArray, rgbArrayToString} from '../../../../../utils';
describe('Settings > Display > Theme', () => {
    before(() => {
        cy.apiInitSetup({loginAfter: true}).then(({offTopicUrl}) => {
            cy.visit(offTopicUrl);
        });
    });
    beforeEach(() => {
        cy.reload();
        cy.postMessage('hello');
        cy.uiOpenSettingsModal('Display');
        cy.get('#displayButton').
            should('be.visible').
            click();
        cy.get('#themeTitle').
            scrollIntoView().
            should('be.visible').
            click();
        cy.get('#customThemes').
            should('be.visible').
            click();
    });
    it('MM-T280_1 Theme Colors - Color Picker (Sidebar styles)', () => {
        verifyColorPickerChange(
            'Sidebar Styles',
            '#sidebarBg-squareColorIcon',
            '#sidebarBg-inputColorValue',
            '#sidebarBg-squareColorIconValue',
        );
    });
    it('MM-T280_2 Theme Colors - Color Picker (Center Channel styles)', () => {
        verifyColorPickerChange(
            'Center Channel Styles',
            '#centerChannelBg-squareColorIcon',
            '#centerChannelBg-inputColorValue',
            '#centerChannelBg-squareColorIconValue',
        );
    });
    it('MM-T280_3 Theme Colors - Color Picker (Link and Button styles)', () => {
        verifyColorPickerChange(
            'Link and Button Styles',
            '#linkColor-squareColorIcon',
            '#linkColor-inputColorValue',
            '#linkColor-squareColorIconValue',
        );
    });
});
function verifyColorPickerChange(stylesText, iconButtonId, inputId, iconValueId) {
    cy.findByText(stylesText).scrollIntoView().should('be.visible').click({force: true});
    cy.get(iconButtonId).click();
    cy.get('.color-popover').should('be.visible').click(15, 40);
    cy.get(iconButtonId).click();
    cy.get('#standardThemes').
        scrollIntoView().
        should('be.visible').
        check();
    cy.get('#customThemes').
        scrollIntoView().
        should('be.visible').
        check();
    cy.findByText(stylesText).
        scrollIntoView().
        should('be.visible').
        click({force: true});
    cy.get(inputId).
        scrollIntoView().
        should('be.visible').
        invoke('attr', 'value').
        then((hexColor) => {
            const rbgArr = hexToRgbArray(hexColor);
            cy.get(iconValueId).should('be.visible').and('have.css', 'background-color', rgbArrayToString(rbgArr));
        });
}