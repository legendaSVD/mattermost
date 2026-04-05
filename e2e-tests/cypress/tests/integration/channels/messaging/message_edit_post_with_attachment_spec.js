import * as TIMEOUTS from '../../../fixtures/timeouts';
describe('Messaging', () => {
    let offtopiclink;
    before(() => {
        cy.apiInitSetup({loginAfter: true}).then(({team}) => {
            offtopiclink = `/${team.name}/channels/off-topic`;
            cy.visit(offtopiclink);
        });
    });
    it('MM-T99 Edit Post with attachment, paste text in middle', () => {
        cy.get('#sidebarItem_off-topic').click({force: true});
        cy.url().should('include', offtopiclink);
        cy.get('#fileUploadInput').attachFile('mattermost-icon.png');
        cy.postMessage('This is sample text');
        cy.getLastPostId().then((postID) => {
            cy.clickPostDotMenu();
            cy.get(`#edit_post_${postID}`).click();
            cy.get('#edit_textbox').
                should('be.visible').
                and('be.focused').
                wait(TIMEOUTS.HALF_SEC).
                type('{leftarrow}{leftarrow}{leftarrow}{leftarrow}').type('add ').type('{enter}');
            cy.get(`#postMessageText_${postID}`).should('have.text', 'This is sample add text Edited');
            cy.get(`#${postID}_message`).within(() => {
                cy.get('.file-view--single').should('be.visible');
            });
        });
    });
});