describe('Keyboard Shortcuts', () => {
    let testTeam;
    before(() => {
        cy.apiInitSetup({loginAfter: true}).then(({team, offTopicUrl}) => {
            testTeam = team;
            cy.visit(offTopicUrl);
        });
    });
    it('MM-T1265 UP - System message does not open for edit; opens previous regular message', () => {
        const message = 'Test message';
        const newHeader = 'New Header';
        cy.postMessage(message);
        cy.apiGetChannelByName(testTeam.name, 'off-topic').then(({channel}) => {
            cy.apiPatchChannel(channel.id, {header: newHeader});
        });
        cy.uiWaitUntilMessagePostedIncludes(newHeader);
        cy.findByTestId('post_textbox').
            type('{uparrow}');
        cy.get('#edit_textbox').
            should('be.visible').
            should('have.text', message);
    });
});