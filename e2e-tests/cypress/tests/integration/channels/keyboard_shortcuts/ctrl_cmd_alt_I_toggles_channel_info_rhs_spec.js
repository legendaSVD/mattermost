describe('Keyboard Shortcuts', () => {
    let url;
    before(() => {
        cy.apiInitSetup({loginAfter: true}).then(({channelUrl}) => {
            url = channelUrl;
        });
    });
    it('MM-T4775 CTRL/CMD+ALT+I - Toggle Channel Info RHS', () => {
        cy.visit(url);
        cy.get('.channel-intro').should('be.visible');
        cy.contains('#rhsContainer', 'Info').should('not.exist');
        cy.get('body').cmdOrCtrlShortcut('{alt}I');
        cy.contains('#rhsContainer', 'Info').should('be.visible');
        cy.get('body').cmdOrCtrlShortcut('{alt}I');
        cy.contains('#rhsContainer', 'Info').should('not.exist');
    });
});