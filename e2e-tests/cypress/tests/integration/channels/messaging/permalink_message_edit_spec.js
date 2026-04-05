import * as TIMEOUTS from '../../../fixtures/timeouts';
describe('Permalink message edit', () => {
    let testTeam;
    let testUser;
    let otherUser;
    before(() => {
        cy.apiInitSetup().then(({team, user}) => {
            testTeam = team;
            testUser = user;
            cy.apiCreateUser().then(({user: user1}) => {
                otherUser = user1;
                cy.apiAddUserToTeam(testTeam.id, otherUser.id);
            });
        });
    });
    it('MM-T180 Edit a message in permalink view', () => {
        cy.apiLogin(testUser);
        cy.visit(`/${testTeam.name}/channels/town-square`);
        const searchWord = `searchtest ${Date.now()}`;
        cy.postMessage(searchWord);
        cy.uiGetSearchContainer().click();
        cy.uiGetSearchBox().type(searchWord).type('{enter}');
        cy.get('.search-item__jump').first().click();
        cy.getLastPostId().then((postId) => {
            cy.url().should('include', `/${testTeam.name}/channels/town-square/${postId}`);
            cy.clickPostDotMenu(postId);
            cy.get(`#edit_post_${postId}`).click();
            const editedText = `edited - ${searchWord}`;
            cy.get('#edit_textbox').should('be.visible').type('any').click().focused().clear({force: true}).type(editedText).type('{enter}');
            verifyEditedPermalink(postId, editedText, testTeam);
            cy.apiLogin(otherUser);
            cy.visit(`/${testTeam.name}/channels/town-square`);
            cy.postMessage('hello');
            cy.uiGetSearchContainer().click();
            cy.uiGetSearchBox().should('be.visible').type(searchWord).type('{enter}');
            cy.get('.search-item__jump').first().click();
            cy.url().should('include', `/${testTeam.name}/channels/town-square/${postId}`);
            verifyEditedPermalink(postId, editedText, testTeam);
        });
    });
    function verifyEditedPermalink(permalinkId, text, team) {
        cy.wait(TIMEOUTS.FIVE_SEC).url().should('include', `/${team.name}/channels/town-square`).and('not.include', `/${permalinkId}`);
        cy.get(`#postMessageText_${permalinkId}`).should('have.text', `${text} Edited`);
        cy.get(`#postEdited_${permalinkId}`).should('have.text', 'Edited');
    }
});