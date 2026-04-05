import * as TIMEOUTS from '../../../../fixtures/timeouts';
describe('Customization', () => {
    let origConfig;
    before(() => {
        cy.apiGetConfig().then(({config}) => {
            origConfig = config;
        });
        cy.visit('/admin_console/site_config/customization');
        cy.get('.admin-console__header').should('be.visible').and('have.text', 'Customization');
    });
    it('MM-T1207 - Can change Custom Brand Image setting', () => {
        cy.apiUpdateConfig({TeamSettings: {EnableCustomBrand: false}});
        cy.reload();
        cy.get('[id="TeamSettings.EnableCustomBrandtrue"]').check();
        cy.findByTestId('CustomBrandImage').should('be.visible').within(() => {
            cy.get('legend').should('be.visible').and('have.text', 'Custom Brand Image:');
            const contents = 'Customize your user experience by adding a custom image to your login screen. Recommended maximum image size is less than 2 MB.';
            cy.get('.help-text').should('be.visible').and('have.text', contents);
            cy.get('input').attachFile('mattermost-icon.png');
        });
        saveSetting();
        cy.reload();
        cy.findByTestId('CustomBrandImage').should('be.visible').within(() => {
            cy.get('img').should('have.attr', 'src').and('include', '/api/v4/brand/image?t=');
        });
    });
    it('MM-T1204 - Can change Site Name setting', () => {
        cy.findByTestId('TeamSettings.SiteNamelabel').scrollIntoView().should('be.visible').and('have.text', 'Site Name:');
        cy.findByTestId('TeamSettings.SiteNameinput').should('have.value', origConfig.TeamSettings.SiteName);
        cy.findByTestId('TeamSettings.SiteNamehelp-text').should('be.visible').and('have.text', 'Name of service shown in login screens and UI. When not specified, it defaults to "Mattermost".');
        const siteName = 'New site name';
        cy.findByTestId('TeamSettings.SiteNameinput').clear().type(siteName);
        saveSetting();
        cy.apiGetConfig().then(({config}) => {
            expect(config.TeamSettings.SiteName).to.eq(siteName);
        });
    });
    it('MM-T1205 - Can change Site Description setting', () => {
        cy.findByTestId('TeamSettings.CustomDescriptionTextlabel').should('be.visible').and('have.text', 'Site Description: ');
        cy.findByTestId('TeamSettings.CustomDescriptionTextinput').should('have.value', origConfig.TeamSettings.CustomDescriptionText);
        cy.findByTestId('TeamSettings.CustomDescriptionTexthelp-text').find('span').should('be.visible').and('have.text', 'Displays as a title above the login form. When not specified, the phrase "Log in" is displayed.');
        const siteDescription = 'New site description';
        cy.findByTestId('TeamSettings.CustomDescriptionTextinput').clear().type(siteDescription);
        saveSetting();
        cy.apiGetConfig().then(({config}) => {
            expect(config.TeamSettings.CustomDescriptionText).to.eq(siteDescription);
        });
    });
    it('MM-T1208 - Can change Custom Brand Text setting', () => {
        cy.findByTestId('TeamSettings.CustomBrandTextlabel').scrollIntoView().should('be.visible').and('have.text', 'Custom Brand Text:');
        cy.findByTestId('TeamSettings.CustomBrandTextinput').should('have.value', origConfig.TeamSettings.CustomBrandText);
        cy.findByTestId('TeamSettings.CustomBrandTexthelp-text').find('span').should('be.visible').and('have.text', 'Text that will appear below your custom brand image on your login screen. Supports Markdown-formatted text. Maximum 500 characters allowed.');
        cy.findByTestId('TeamSettings.EnableCustomBrandtrue').check({force: true});
        const customBrandText = 'Random brand text';
        cy.findByTestId('TeamSettings.CustomBrandTextinput').clear().type(customBrandText);
        saveSetting();
        cy.apiGetConfig().then(({config}) => {
            expect(config.TeamSettings.CustomBrandText).to.eq(customBrandText);
        });
    });
    it('MM-T1206 - Can change Enable Custom Branding setting', () => {
        cy.apiUpdateConfig({TeamSettings: {EnableCustomBrand: false}});
        cy.reload();
        cy.findByTestId('TeamSettings.EnableCustomBrand').should('be.visible').within(() => {
            cy.get('legend:contains("Enable Custom Branding: ")').should('be.visible');
            const content = 'Enable custom branding to show an image of your choice, uploaded below, and some help text, written below, on the login page.';
            cy.get('.help-text').should('be.visible').and('have.text', content);
            cy.findByTestId('TeamSettings.EnableCustomBrandtrue').check();
        });
        saveSetting();
        cy.apiGetConfig().then(({config}) => {
            expect(config.TeamSettings.EnableCustomBrand).to.equal(true);
        });
        cy.findByTestId('TeamSettings.EnableCustomBrandfalse').check();
        saveSetting();
        cy.apiGetConfig().then(({config}) => {
            expect(config.TeamSettings.EnableCustomBrand).to.equal(false);
        });
    });
});
function saveSetting() {
    cy.get('#saveSetting').
        should('have.text', 'Save').
        and('be.enabled').
        click().
        should('be.disabled').
        wait(TIMEOUTS.HALF_SEC);
}