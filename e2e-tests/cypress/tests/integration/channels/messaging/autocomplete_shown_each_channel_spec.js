describe('Identical Message Drafts', () => {
    let testTeam;
    let testChannelA;
    let testChannelB;
    before(() => {
        cy.apiInitSetup({
            loginAfter: true,
            channelPrefix: {name: 'ca', displayName: 'CB'},
        }).then(({team, channel}) => {
            testTeam = team;
            testChannelA = channel;
            cy.apiCreateChannel(testTeam.id, 'cb', 'CB').then((out) => {
                testChannelB = out.channel;
            });
            cy.visit(`/${testTeam.name}/channels/${testChannelA.name}`);
            cy.postMessage('hello');
        });
    });
    it('MM-T132 Identical Message Drafts - Autocomplete shown in each channel', () => {
        cy.uiGetPostTextBox().type('@');
        cy.get('#suggestionList').should('be.visible');
        cy.get(`#sidebarItem_${testChannelB.name}`).should('be.visible').click();
        cy.url().should('include', `/channels/${testChannelB.name}`);
        cy.get('#suggestionList').should('not.exist');
        cy.uiGetPostTextBox().type('@');
        cy.get('#suggestionList').should('be.visible');
        cy.get('#sidebarItem_off-topic').should('be.visible').click();
        cy.get(`#sidebarItem_${testChannelA.name}`).should('be.visible').click();
        cy.url().should('include', `/channels/${testChannelA.name}`);
        cy.uiGetPostTextBox();
        cy.get('#suggestionList').should('be.visible');
    });
});