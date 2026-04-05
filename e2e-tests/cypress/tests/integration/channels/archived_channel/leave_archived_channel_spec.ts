describe('Leaving archived channels', () => {
    let testTeam;
    before(() => {
        cy.apiInitSetup({loginAfter: true}).then(({team}) => {
            testTeam = team;
        });
    });
    it('MM-T1685 User can leave archived public channel', () => {
        cy.apiCreateChannel(testTeam.id, 'channel', 'channel').then(({channel}) => {
            cy.visit(`/${testTeam.name}/channels/${channel.name}`);
            cy.uiArchiveChannel();
            cy.uiLeaveChannel();
            cy.url().should('include', '/channels/town-square');
        });
    });
    it('MM-T1686 User can leave archived private channel', () => {
        cy.apiCreateChannel(testTeam.id, 'channel', 'channel', 'P').then(({channel}) => {
            cy.visit(`/${testTeam.name}/channels/${channel.name}`);
            cy.uiArchiveChannel();
            cy.uiLeaveChannel(true);
            cy.url().should('include', '/channels/town-square');
        });
    });
});