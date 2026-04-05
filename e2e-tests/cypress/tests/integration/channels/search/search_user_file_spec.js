import * as TIMEOUTS from '../../../fixtures/timeouts';
function createNewDMChannel(channelname) {
    cy.uiAddDirectMessage().scrollIntoView().click();
    cy.get('#selectItems input').typeWithForce(channelname);
    cy.contains('.more-modal__description', channelname).click({force: true});
    cy.get('#saveItems').click().wait(TIMEOUTS.ONE_SEC);
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
    it('Search "in:[username]" returns file results in DMs', () => {
        cy.uiGetLhsSection('DIRECT MESSAGES').should('be.visible');
        createNewDMChannel(otherUser.email);
        cy.get('#advancedTextEditorCell').find('#fileUploadInput').attachFile('word-file.doc');
        cy.get('.post-image__thumbnail').should('be.visible');
        cy.uiGetPostTextBox().clear().type('{enter}');
        cy.uiGetSearchContainer().should('be.visible').click();
        cy.uiGetSearchBox().type('in:');
        cy.contains('.suggestion-list__item', `@${otherUser.username}`).scrollIntoView().click();
        cy.uiGetSearchBox().should('have.value', 'in:@' + otherUser.username + ' ');
        cy.uiGetSearchBox().type('word-file').type('{enter}');
        cy.get('.files-tab').should('be.visible').click();
        cy.get('#search-items-container').find('.fileDataName').each(($el) => {
            cy.wrap($el).should('have.text', 'word-file.doc');
        });
    });
});