describe('Channel user count', () => {
    let testTeam;
    let secondUser;
    before(() =>
        cy.apiInitSetup().then(({team}) => {
            testTeam = team;
            cy.visit(`/${testTeam.name}/channels/off-topic`);
        }),
    );
    it('MM-T481 User count is updated if user automatically joins channel', () => {
        const initialUserCount = 2;
        cy.get('#channelMemberCountText').should('be.visible').and('have.text', `${initialUserCount}`);
        cy.get('#channelMemberCountText').invoke('text').as('initialUserCountText');
        cy.apiCreateUser().then(({user}) => {
            secondUser = user;
            cy.apiAddUserToTeam(testTeam.id, secondUser.id);
        });
        cy.apiGetChannelByName(testTeam.name, 'off-topic').then(({channel}) => {
            cy.apiAddUserToChannel(channel.id, secondUser.id);
        });
        cy.get('#channelMemberCountText').should('be.visible').and('have.text', `${initialUserCount + 1}`);
    });
});