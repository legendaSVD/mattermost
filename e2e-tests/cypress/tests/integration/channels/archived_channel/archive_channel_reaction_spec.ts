import * as TIMEOUTS from '../../../fixtures/timeouts';
describe('Archived channels', () => {
    before(() => {
        cy.apiInitSetup({loginAfter: true}).then(({team, channel}) => {
            cy.visit(`/${team.name}/channels/${channel.name}`);
        });
    });
    it('MM-T1718 Reaction icon should not be visible for archived channel posts', () => {
        const messageText = 'Test archive reaction';
        cy.postMessage(messageText);
        cy.getLastPostId().then((postId) => {
            cy.clickPostDotMenu();
            cy.wait(TIMEOUTS.HALF_SEC).get(`#CENTER_reaction_${postId}`).should('be.visible');
            cy.get('body').type('{esc}');
            cy.uiArchiveChannel();
            cy.clickPostDotMenu(postId);
            cy.wait(TIMEOUTS.HALF_SEC).get(`#CENTER_reaction_${postId}`).should('not.exist');
            cy.get('body').type('{esc}');
            cy.clickPostCommentIcon(postId);
            cy.clickPostDotMenu(postId, 'RHS_ROOT');
            cy.wait(TIMEOUTS.HALF_SEC).get(`#RHS_ROOT_reaction_${postId}`).should('not.exist');
            cy.get('body').type('{esc}');
            cy.uiGetSearchContainer().click();
            cy.uiGetSearchBox().should('be.visible').type(messageText).type('{enter}');
            cy.clickPostDotMenu(postId, 'SEARCH');
            cy.wait(TIMEOUTS.HALF_SEC).get(`#searchResult_reaction_${postId}`).should('not.exist');
        });
    });
});