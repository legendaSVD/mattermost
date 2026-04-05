import {hexToRgbArray, rgbArrayToString} from '../../../../utils';
import * as TIMEOUTS from '../../../../fixtures/timeouts';
describe('Announcement Banner', () => {
    before(() => {
        cy.apiRequireLicense();
    });
    it('MM-T1128 Announcement Banner - Dismissible banner shows long text truncated', () => {
        const bannerEmbedLink = 'http://example.com';
        const bannerEndLink = 'http://example.com/the_end';
        const bannerText = `Here's an announcement! It has a link: ${bannerEmbedLink}. It's a really long announcement, because we have a lot to say. Be sure to read it all, click the link, then dismiss the banner, and then you can go on to the next test, which will have a shorter announcement. Thank you for reading [to the end](${bannerEndLink}) and have a nice day!`;
        const bannerBgColor = '#4378da';
        const bannerBgColorRGBArray = hexToRgbArray(bannerBgColor);
        const bannerTextColor = '#ffffff';
        const bannerTextColorRGBArray = hexToRgbArray(bannerTextColor);
        cy.visit('/admin_console/site_config/announcement_banner');
        cy.findByTestId('AnnouncementSettings.EnableBanner').
            should('be.visible').
            within(() => {
                cy.findByTestId('AnnouncementSettings.EnableBannertrue').
                    should('be.visible').
                    click({force: true});
            });
        cy.findByTestId('AnnouncementSettings.BannerText').
            should('be.visible').
            within(() => {
                cy.get('input').
                    should('be.visible').
                    clear().
                    invoke('val', bannerText).
                    wait(TIMEOUTS.HALF_SEC).
                    type(' {backspace}{enter}');
            });
        cy.findByTestId('AnnouncementSettings.BannerColor').
            should('be.visible').
            within(() => {
                cy.get('input').
                    should('be.visible').
                    clear().
                    type(bannerBgColor);
            });
        cy.findByTestId('AnnouncementSettings.BannerTextColor').
            should('be.visible').
            within(() => {
                cy.get('input').
                    should('be.visible').
                    clear().
                    type(bannerTextColor);
            });
        cy.findByTestId('AnnouncementSettings.AllowBannerDismissal').
            should('be.visible').
            within(() => {
                cy.findByTestId('AnnouncementSettings.AllowBannerDismissaltrue').
                    should('be.visible').
                    click({force: true});
            });
        cy.get('.admin-console').
            should('exist').
            within(() => {
                cy.findByText('Save').should('be.visible').click();
            });
        cy.get('.announcement-bar').
            as('announcementBanner').
            should('exist').
            and('is.visible').
            and('have.css', 'overflow', 'hidden').
            and(
                'have.css',
                'background-color',
                rgbArrayToString(bannerBgColorRGBArray),
            ).
            and('have.css', 'color', rgbArrayToString(bannerTextColorRGBArray)).
            contains('a', bannerEmbedLink).
            should('have.attr', 'href', bannerEmbedLink);
        cy.findByText(/Here's an announcement! It has a link: /).
            should('be.visible').
            within(() => {
                cy.get(`a[href="${bannerEmbedLink}"]`).should('be.visible');
                cy.get(`a[href="${bannerEndLink}"]`).should('not.be.visible');
            });
        cy.get('a.backstage-navbar__back').click();
        cy.get('@announcementBanner').trigger('mouseover');
        cy.get('#announcement-bar__tooltip').
            as('announcementBannerTooltip').
            should('be.visible').
            within(() => {
                cy.findByText(/Here's an announcement! It has a link: /).should(
                    'be.visible',
                );
                cy.findByText(
                    /. It's a really long announcement, because we have a lot to say. Be sure to read it all, click the link, then dismiss the banner, and then you can go on to the next test, which will have a shorter announcement. Thank you for reading and have a nice day!/,
                ).should('be.visible');
            });
        cy.get('@announcementBanner').trigger('mouseout');
        cy.get('@announcementBannerTooltip').should('not.exist');
        cy.get('.announcement-bar__close').should('be.visible').click();
        cy.get('@announcementBanner').should('not.exist');
    });
});