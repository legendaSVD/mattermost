describe('Main menu', () => {
    before(() => {
        cy.visit('/admin_console');
        cy.get('button > span[class="menu-icon"]').click();
    });
    const verifyLink = (text, link) => {
        cy.get('li.MenuItem').
            contains(text).
            scrollIntoView().
            should('have.attr', 'target', '_blank').
            should('have.attr', 'href').
            and('contain', link);
    };
    it('MM-T909 Can switch to team', () => {
        cy.findByText('Switch to eligendi').should('be.visible');
    });
    it('MM-T910 Can open Administrators Guide', () => {
        cy.apiGetClientLicense().then(({isCloudLicensed}) => {
            const guideLink = isCloudLicensed ?
                'https://docs.mattermost.com/guides/administration.html#cloud-workspace-management' :
                'https://docs.mattermost.com/guides/administration.html';
            verifyLink("Administrator's Guide", guideLink);
        });
    });
    it('MM-T911 Can open Troubleshooting Forum', () => {
        verifyLink('Troubleshooting Forum', 'https://forum.mattermost.com/t/how-to-use-the-troubleshooting-forum/150');
    });
    it('MM-T914 Can log out from system console', () => {
        cy.findByText('Log Out').should('be.visible');
    });
    it('MM-T912 Can open Commercial Support', () => {
        cy.findByText('Commercial Support').click();
        cy.get('#commercialSupportModal').should('be.visible');
        cy.uiClose();
    });
});