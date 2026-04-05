import * as TIMEOUTS from '../../../../../fixtures/timeouts';
describe('Settings > Display > Theme > Custom Theme Colors', () => {
    before(() => {
        cy.apiInitSetup({loginAfter: true}).then(({offTopicUrl}) => {
            cy.visit(offTopicUrl);
            cy.postMessage('```\ncode\n```');
        });
    });
    [
        {name: 'github', backgroundColor: 'rgb(255, 255, 255)', color: 'rgb(36, 41, 46)'},
        {name: 'monokai', backgroundColor: 'rgb(39, 40, 34)', color: 'rgb(221, 221, 221)'},
        {name: 'solarized-light', backgroundColor: 'rgb(253, 246, 227)', color: 'rgb(88, 110, 117)'},
        {name: 'solarized-dark', backgroundColor: 'rgb(0, 43, 54)', color: 'rgb(147, 161, 161)'},
    ].forEach((theme, index) => {
        it(`MM-T293_${index + 1} Theme Colors - Code (${theme.name})`, () => {
            navigateToThemeSettings();
            cy.get('#customThemes').check().should('be.checked');
            cy.get('#centerChannelStylesAccordion').click({force: true}).wait(TIMEOUTS.ONE_HUNDRED_MILLIS);
            cy.get('#codeThemeSelect').
                scrollIntoView({offset: {top: 20, left: 0}}).
                should('exist').
                select(theme.name, {force: true});
            verifyLastPostStyle(theme);
            cy.get('#saveSetting').click().wait(TIMEOUTS.HALF_SEC);
            cy.uiClose();
            verifyLastPostStyle(theme);
            cy.reload();
            verifyLastPostStyle(theme);
        });
    });
});
function verifyLastPostStyle(codeTheme) {
    cy.getLastPostId().then((postId) => {
        const postCodeBlock = `#postMessageText_${postId} code`;
        cy.get(postCodeBlock).
            should('have.css', 'background-color', codeTheme.backgroundColor).
            and('have.css', 'color', codeTheme.color);
    });
}
function navigateToThemeSettings() {
    cy.uiOpenSettingsModal('Display');
    cy.get('#themeTitle').should('be.visible');
    cy.get('#themeEdit').click();
    cy.get('.section-max').scrollIntoView();
}