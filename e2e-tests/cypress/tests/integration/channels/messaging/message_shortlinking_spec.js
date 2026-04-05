describe('Message', () => {
    let testChannel;
    let testTeam;
    before(() => {
        cy.apiInitSetup({loginAfter: true}).then(({team, channel}) => {
            testChannel = channel;
            testTeam = team;
            cy.visit(`/${testTeam.name}/channels/off-topic`);
        });
    });
    it('MM-T175 Channel shortlinking still works when placed in brackets', () => {
        const shortLink = `(~${testChannel.name})`;
        const longLink = `~${testChannel.display_name}`;
        cy.postMessage('hello');
        cy.uiGetPostTextBox().type(shortLink).type('{enter}');
        cy.getLastPostId().then((postId) => {
            const divPostId = `#postMessageText_${postId}`;
            cy.get(divPostId).contains(longLink).click();
            cy.location('pathname').should('contain', `${testTeam.name}/channels/${testChannel.name}`);
            cy.get('#channelHeaderTitle').should('contain', testChannel.display_name);
        });
    });
});