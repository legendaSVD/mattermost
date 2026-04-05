describe('Messaging', () => {
    let testTeam;
    let testChannel;
    let receiver;
    let lastPostId;
    before(() => {
        cy.apiInitSetup().then(({team, channel, user}) => {
            receiver = user;
            testTeam = team;
            testChannel = channel;
            cy.apiLogin(receiver);
            cy.visit(`/${testTeam.name}/channels/${testChannel.name}`);
            cy.postMessage('휴');
            cy.getLastPostId().then((postId) => {
                lastPostId = postId;
            });
        });
    });
    it('MM-T1667 - Post with only 2 byte characters shouldn\'t remain after posting', () => {
        testChannel.name = testChannel.name.replace(/\s+/g, '-').toLowerCase();
        cy.get(`#postMessageText_${lastPostId}`).should('contain', '휴');
        cy.get('#sidebarItem_town-square').click();
        cy.get(`#sidebarItem_${testChannel.name}`).findByTestId('draftIcon').should('not.exist');
        cy.visit(`/${testTeam.name}/channels/${testChannel.name}`);
        cy.uiGetPostTextBox().should('have.value', '');
    });
});