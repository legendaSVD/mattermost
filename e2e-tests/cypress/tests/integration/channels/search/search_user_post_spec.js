function createNewDMChannel(channelname) {
    cy.uiAddDirectMessage().scrollIntoView().click();
    cy.get('#selectItems input').typeWithForce(channelname);
    cy.contains('.more-modal__description', channelname).click({force: true});
    cy.get('#saveItems').click();
}
describe('Search in DMs', () => {
    let otherUser;
    before(() => {
        cy.apiInitSetup().then(({team, channel, user: testUser}) => {
            Cypress._.times(5, (i) => {
                cy.apiCreateUser().then(({user}) => {
                    if (i === 0) {
                        otherUser = user;
                    }
                    cy.apiAddUserToTeam(team.id, user.id).then(() => {
                        cy.apiAddUserToChannel(channel.id, user.id);
                    });
                });
            });
            cy.apiLogin(testUser);
            cy.visit(`/${team.name}/channels/${channel.name}`);
        });
    });
    it('MM-T358 Search "in:[username]" returns results in DMs', () => {
        const message = 'Hello' + Date.now();
        cy.uiGetLhsSection('DIRECT MESSAGES').should('be.visible');
        createNewDMChannel(otherUser.email);
        cy.postMessage(message);
        cy.uiGetSearchContainer().should('be.visible').click();
        cy.uiGetSearchBox().type('in:');
        cy.contains('.suggestion-list__item', `@${otherUser.username}`).scrollIntoView().click();
        cy.uiGetSearchBox().should('have.value', 'in:@' + otherUser.username + ' ');
        cy.uiGetSearchBox().type(message).type('{enter}');
        cy.get('#search-items-container').find('.search-highlight').each(($el) => {
            cy.wrap($el).should('have.text', message);
        });
    });
});