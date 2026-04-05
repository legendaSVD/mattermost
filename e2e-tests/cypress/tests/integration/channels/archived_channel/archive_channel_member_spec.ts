describe('Archive channel members spec', () => {
    before(() => {
        cy.apiInitSetup({loginAfter: true, promoteNewUserAsAdmin: true}).then(({team, channel}) => {
            cy.visit(`/${team.name}/channels/${channel.name}`);
        });
    });
    it('MM-T1719 Archived channel members cannot be managed', () => {
        cy.get('#channelHeaderTitle').click();
        cy.get('#channelMembers').should('be.visible');
        cy.get('body').type('{esc}{esc}');
        cy.uiArchiveChannel();
        cy.get('#channelHeaderTitle').click();
        cy.get('#channelMembers').should('be.visible').click();
        cy.uiGetRHS().findByText('Manage').should('not.exist');
    });
});