import {FixedPublicLinks} from '../../../../utils';
describe('Edition and License', () => {
    before(() => {
        cy.shouldNotRunOnCloudEdition();
        cy.apiRequireLicense();
        cy.visit('/admin_console');
    });
    it('MM-T899 - Edition and License: Verify Privacy Policy link points to correct URL', () => {
        [
            {text: 'Privacy Policy', link: FixedPublicLinks.PrivacyPolicy},
            {text: 'Enterprise Edition Terms of Use', link: FixedPublicLinks.TermsOfService},
        ].forEach(({text, link}) => {
            cy.findByText(text).
                scrollIntoView().
                should('be.visible').
                and('have.attr', 'href').
                and('include', link);
        });
    });
});