import * as TIMEOUTS from '../../../../fixtures/timeouts';
describe('Customization', () => {
    let origConfig;
    before(() => {
        cy.shouldNotRunOnCloudEdition();
        cy.apiGetConfig().then(({config}) => {
            origConfig = config;
        });
        cy.visit('/admin_console/site_config/customization');
        cy.get('.admin-console__header').should('be.visible').and('have.text', 'Customization');
    });
    it('MM-T1214 - Can change Report a Problem Link setting', () => {
        cy.findByTestId('SupportSettings.ReportAProblemLinklabel').scrollIntoView().should('be.visible').and('have.text', 'Report a Problem Link:');
        cy.findByTestId('SupportSettings.ReportAProblemLinkinput').should('have.value', origConfig.SupportSettings.ReportAProblemLink);
        cy.findByTestId('SupportSettings.ReportAProblemLinkhelp-text').find('span').should('be.visible').and('have.text', 'The URL for the Report a Problem link in the Help Menu. If this field is empty, the link is removed from the Help Menu.');
        const reportAProblemLink = 'https://mattermost.com/pl/report-a-bug';
        cy.findByTestId('SupportSettings.ReportAProblemLinkinput').clear().type(reportAProblemLink);
        saveSetting();
        cy.apiGetConfig().then(({config}) => {
            expect(config.SupportSettings.ReportAProblemLink).to.eq(reportAProblemLink);
        });
    });
    it('MM-T1212 - Can change Privacy Policy Link setting', () => {
        cy.findByTestId('SupportSettings.PrivacyPolicyLinklabel').scrollIntoView().should('be.visible').and('have.text', 'Privacy Policy Link:');
        const content = 'The URL for the Privacy link on the login and sign-up pages. If this field is empty, the Privacy link is hidden from users.';
        cy.findByTestId('SupportSettings.PrivacyPolicyLinkhelp-text').scrollIntoView().find('span').should('be.visible').and('have.text', content);
        cy.findByTestId('SupportSettings.PrivacyPolicyLinkinput').scrollIntoView().should('have.value', origConfig.SupportSettings.PrivacyPolicyLink).and('be.visible');
        const stringToSave = 'https://some.com';
        cy.findByTestId('SupportSettings.PrivacyPolicyLinkinput').clear().type(stringToSave);
        saveSetting();
        cy.apiGetConfig().then(({config}) => {
            expect(config.SupportSettings.PrivacyPolicyLink).to.equal(stringToSave);
        });
    });
    it('MM-T1216 Can change Android App Download Link setting', () => {
        cy.findByTestId('NativeAppSettings.AndroidAppDownloadLink').scrollIntoView().should('be.visible');
        cy.findByTestId('NativeAppSettings.AndroidAppDownloadLinklabel').should('be.visible').and('have.text', 'Android App Download Link:');
        cy.findByTestId('NativeAppSettings.AndroidAppDownloadLinkinput').should('have.value', origConfig.NativeAppSettings.AndroidAppDownloadLink);
        cy.findByTestId('NativeAppSettings.AndroidAppDownloadLinkhelp-text').find('span').should('be.visible').and('have.text', 'Add a link to download the Android app. Users who access the site on a mobile web browser will be prompted with a page giving them the option to download the app. Leave this field blank to prevent the page from appearing.');
        const newAndroidAppDownloadLink = 'https://example.com/android-app/';
        cy.findByTestId('NativeAppSettings.AndroidAppDownloadLinkinput').clear().type(newAndroidAppDownloadLink).should('have.value', newAndroidAppDownloadLink);
        saveSetting();
        cy.apiGetConfig().then(({config}) => {
            expect(config.NativeAppSettings.AndroidAppDownloadLink).to.equal(newAndroidAppDownloadLink);
        });
    });
    it('MM-T1217 Can change iOS App Download Link setting', () => {
        cy.findByTestId('NativeAppSettings.IosAppDownloadLink').scrollIntoView().should('be.visible');
        cy.findByTestId('NativeAppSettings.IosAppDownloadLinklabel').should('be.visible').and('have.text', 'iOS App Download Link:');
        cy.findByTestId('NativeAppSettings.IosAppDownloadLinkinput').should('have.value', origConfig.NativeAppSettings.IosAppDownloadLink);
        cy.findByTestId('NativeAppSettings.IosAppDownloadLinkhelp-text').find('span').should('be.visible').and('have.text', 'Add a link to download the iOS app. Users who access the site on a mobile web browser will be prompted with a page giving them the option to download the app. Leave this field blank to prevent the page from appearing.');
        const newIosAppDownloadLink = 'https://example.com/iOS-app/';
        cy.findByTestId('NativeAppSettings.IosAppDownloadLinkinput').clear().type(newIosAppDownloadLink).should('have.value', newIosAppDownloadLink);
        saveSetting();
        cy.apiGetConfig().then(({config}) => {
            expect(config.NativeAppSettings.IosAppDownloadLink).to.equal(newIosAppDownloadLink);
        });
    });
    it('MM-T1215 - Can change Mattermost Apps Download Page Link setting', () => {
        cy.findByTestId('NativeAppSettings.AppDownloadLinklabel').scrollIntoView().should('be.visible').and('have.text', 'Mattermost Apps Download Page Link:');
        cy.findByTestId('NativeAppSettings.AppDownloadLinkinput').should('have.value', origConfig.NativeAppSettings.AppDownloadLink);
        cy.findByTestId('NativeAppSettings.AppDownloadLinkhelp-text').find('span').should('be.visible').and('have.text', 'Add a link to a download page for the Mattermost apps. When a link is present, an option to "Download Mattermost Apps" will be added in the Product Menu so users can find the download page. Leave this field blank to hide the option from the Product Menu.');
        const newAppDownloadLink = 'https://example.com/app-download-link/';
        cy.findByTestId('NativeAppSettings.AppDownloadLinkinput').clear().type(newAppDownloadLink);
        saveSetting();
        cy.apiGetConfig().then(({config}) => {
            expect(config.NativeAppSettings.AppDownloadLink).to.eq(newAppDownloadLink);
        });
    });
    it('MM-T1209 - Can change Help Link setting', () => {
        const contents = ['The URL for the Help link on the Mattermost login page, sign-up pages, and Help Menu. If this field is empty, the Help link is hidden from users.'];
        cy.findByTestId('SupportSettings.HelpLinklabel').scrollIntoView().should('be.visible').and('have.text', 'Help Link:');
        cy.findByTestId('SupportSettings.HelpLinkhelp-text').scrollIntoView().find('span').should('be.visible').and('have.text', contents[0]);
        cy.findByTestId('SupportSettings.HelpLinkinput').scrollIntoView().should('have.value', origConfig.SupportSettings.HelpLink).and('be.visible');
        const stringToSave = 'https://some.com';
        cy.findByTestId('SupportSettings.HelpLinkinput').clear().type(stringToSave);
        saveSetting();
        cy.apiGetConfig().then(({config}) => {
            expect(config.SupportSettings.HelpLink).to.equal(stringToSave);
        });
    });
    it('MM-T1213 Can change About Link setting', () => {
        const newAboutLink = 'https://mattermost.com/';
        cy.findByTestId('SupportSettings.AboutLinklabel').scrollIntoView().should('be.visible').and('have.text', 'About Link:');
        cy.findByTestId('SupportSettings.AboutLinkhelp-text').should('be.visible').and('have.text', 'The URL for the About link on the Mattermost login and sign-up pages. If this field is empty, the About link is hidden from users.');
        cy.findByTestId('SupportSettings.AboutLinkinput').should('be.visible').and('have.value', origConfig.SupportSettings.AboutLink);
        cy.findByTestId('SupportSettings.AboutLinkinput').clear().type(newAboutLink);
        saveSetting();
        cy.apiGetConfig().then(({config}) => {
            expect(config.SupportSettings.AboutLink).to.equal(newAboutLink);
        });
    });
    it('MM-T1211 - Can change Terms of Use Link setting', () => {
        cy.findByTestId('SupportSettings.TermsOfServiceLinklabel').scrollIntoView().should('be.visible').and('have.text', 'Terms of Use Link:');
        cy.findByTestId('SupportSettings.TermsOfServiceLinkinput').should('have.value', origConfig.SupportSettings.TermsOfServiceLink);
        cy.findByTestId('SupportSettings.TermsOfServiceLinkhelp-text').find('span').should('be.visible').and('have.text',
            'Link to the terms under which users may use your online service. By default, this includes the ' +
            '"Mattermost Acceptable Use Policy" explaining the terms under which Mattermost software is ' +
            'provided to end users. If you change the default link to add your own terms for using the service you ' +
            'provide, your new terms must include a link to the default terms so end users are aware of the Mattermost ' +
            'Acceptable Use Policy for Mattermost software.');
        const newValue = 'https://test.com';
        cy.findByTestId('SupportSettings.TermsOfServiceLinkinput').clear().type(newValue);
        saveSetting();
        cy.apiGetConfig().then(({config}) => {
            expect(config.SupportSettings.TermsOfServiceLink).to.eq(newValue);
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