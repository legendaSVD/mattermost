describe('Support Packet Generation', () => {
    before(() => {
        cy.apiRequireLicense();
        cy.apiUpdateConfig({
            LogSettings: {
                FileLevel: 'ERROR',
            },
        });
    });
    it('MM-T3849 - Commercial Support Dialog UI - E10/E20 License', () => {
        cy.visit('/admin_console');
        goToSupportPacketGenerationModal();
        cy.get('div.AlertBanner__body span').should('have.text', 'Before downloading the Support Packet, set Output Logs to File to true and set File Log Level to DEBUG here.');
    });
    it('MM-T3818 - Commercial Support Dialog UI - Links', () => {
        cy.visit('/admin_console');
        goToSupportPacketGenerationModal();
        cy.findByText('submit a support ticket').should('have.attr', 'href').and('include', 'https://support.mattermost.com/hc/en-us/requests/new');
        cy.findByRole('link', {name: 'here'}).should('have.attr', 'href').and('include', '/admin_console/environment/logging');
    });
});
const goToSupportPacketGenerationModal = () => {
    cy.findByRole('button', {name: 'Menu Icon'}).should('exist').click();
    cy.findByRole('button', {name: 'Commercial Support'}).click();
    cy.get('a.DownloadSupportPacket').should('exist');
};