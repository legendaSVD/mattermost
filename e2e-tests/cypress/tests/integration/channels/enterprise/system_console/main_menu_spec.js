describe('Main menu', () => {
    before(() => {
        cy.apiRequireLicense();
        cy.visit('/admin_console');
        cy.get('button > span[class="menu-icon"]').click();
    });
    it('MM-T913 About opens About modal', () => {
        cy.findByText('About Mattermost').click();
        verifyLink('server', 'https://github.com/mattermost/mattermost-server/blob/master/NOTICE.txt');
        verifyLink('desktop', 'https://github.com/mattermost/desktop/blob/master/NOTICE.txt');
        verifyLink('mobile', 'https://github.com/mattermost/mattermost-mobile/blob/master/NOTICE.txt');
        cy.get('[data-testid="aboutModalVersionInfo"]').should('contain.text', 'Server Version:');
        cy.findByText('Licensed to:').should('be.visible');
    });
});
const verifyLink = (text, link) => {
    cy.get('a[href="' + link + '"]').scrollIntoView().should('have.attr', 'target', '_blank');
    cy.get('a[href="' + link + '"]').contains(text);
};