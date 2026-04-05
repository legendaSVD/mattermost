import * as TIMEOUTS from '../../../../fixtures/timeouts';
import {SupportSettings} from '../../../../utils/constants';
describe('SupportSettings', () => {
    before(() => {
        cy.apiRequireLicenseForFeature('Cloud');
        cy.visit('/');
    });
    it('MM-T1031 - Customization Change all links', () => {
        cy.uiOpenHelpMenu().within(() => {
            [
                {text: 'Ask the community', link: SupportSettings.ASK_COMMUNITY_LINK},
                {text: 'Mattermost user guide', link: SupportSettings.MATTERMOST_USER_GUIDE},
                {text: 'Report a problem', link: SupportSettings.REPORT_A_PROBLEM_LINK},
                {text: 'Keyboard shortcuts'},
            ].forEach(({text, link}) => {
                if (link) {
                    cy.findByText(text).
                        parent().
                        should('have.attr', 'href').
                        and('contain', link);
                } else {
                    cy.findByText(text);
                }
            });
        });
        cy.uiLogout();
        cy.url().should('include', '/login');
        const guides = [
            {text: 'About', link: SupportSettings.ABOUT_LINK},
            {text: 'Privacy Policy', link: SupportSettings.PRIVACY_POLICY_LINK},
            {text: 'Terms', link: SupportSettings.TERMS_OF_SERVICE_LINK},
            {text: 'Help', link: SupportSettings.HELP_LINK},
        ];
        guides.forEach((guide) => {
            cy.findByText(guide.text).
                should('have.attr', 'href').
                and('contain', guide.link);
        });
        cy.findByText('Don\'t have an account?', {timeout: TIMEOUTS.HALF_MIN}).should('be.visible').click();
        cy.url().should('include', '/signup_user_complete');
        guides.forEach((guide) => {
            cy.findByText(guide.text).
                should('have.attr', 'href').
                and('contain', guide.link);
        });
    });
});