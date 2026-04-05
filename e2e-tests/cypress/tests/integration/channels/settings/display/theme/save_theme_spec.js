import * as TIMEOUTS from '../../../../../fixtures/timeouts';
describe('Settings > Display > Theme > Save', () => {
    before(() => {
        cy.apiInitSetup({loginAfter: true}).then(({offTopicUrl}) => {
            cy.visit(offTopicUrl);
        });
    });
    it('MM-T2090 Theme Colors: New theme color is saved', () => {
        cy.uiOpenSettingsModal('Display');
        cy.get('#displayButton', {timeout: TIMEOUTS.FIVE_SEC}).should('be.visible').click();
        cy.get('#themeTitle', {timeout: TIMEOUTS.TWO_SEC}).should('be.visible').click();
        cy.get('#premadeThemeIndigo').should('not.have.class', 'active').click();
        cy.get('#premadeThemeIndigo').should('have.class', 'active');
        cy.uiSaveAndClose();
        cy.uiOpenSettingsModal('Display');
        cy.get('#displayButton', {timeout: TIMEOUTS.FIVE_SEC}).should('be.visible').click();
        cy.get('#themeTitle', {timeout: TIMEOUTS.TWO_SEC}).should('be.visible').click();
        cy.get('#premadeThemeIndigo').should('have.class', 'active');
    });
});