import * as TIMEOUTS from '../../../fixtures/timeouts';
describe('Delete the post on text clear', () => {
    let offtopiclink;
    before(() => {
        cy.apiInitSetup({loginAfter: true}).then(({team}) => {
            offtopiclink = `/${team.name}/channels/off-topic`;
            cy.visit(offtopiclink);
        });
    });
    it('MM-T2146 Remove all text from a post (no attachment)', () => {
        cy.get('#sidebarItem_off-topic').click({force: true});
        cy.url().should('include', offtopiclink);
        cy.postMessage('This is sample text');
        cy.getLastPostId().then((postID) => {
            cy.clickPostDotMenu();
            cy.get(`#edit_post_${postID}`).click();
            cy.get('#edit_textbox').should('be.visible').and('be.focused').wait(TIMEOUTS.HALF_SEC).clear().type('{enter}');
            cy.focused().click();
            cy.get(`#postMessageText_${postID}`).should('not.exist');
        });
    });
});