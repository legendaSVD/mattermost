import * as TIMEOUTS from '../../../../fixtures/timeouts';
describe('Settings > Display > Message Display', () => {
    before(() => {
        cy.apiInitSetup({loginAfter: true}).then(({offTopicUrl}) => {
            cy.visit(offTopicUrl);
        });
    });
    it('MM-T103_1 Compact view: Line breaks remain intact after editing', () => {
        verifyLineBreaksRemainIntact('COMPACT');
    });
    it('MM-T103_2 Standard view: Line breaks remain intact after editing', () => {
        verifyLineBreaksRemainIntact('STANDARD');
    });
});
function verifyLineBreaksRemainIntact(display) {
    cy.uiChangeMessageDisplaySetting(display);
    const firstLine = 'First line';
    const secondLine = 'Second line';
    cy.uiGetPostTextBox().
        clear().
        type(firstLine).
        type('{shift}{enter}{enter}').
        type(`${secondLine}{enter}`);
    cy.getLastPostId().then((postId) => {
        const postMessageTextId = `#postMessageText_${postId}`;
        cy.get(postMessageTextId).should('have.text', `${firstLine}\n${secondLine}`);
        cy.clickPostDotMenu(postId);
        cy.get(`#edit_post_${postId}`).scrollIntoView().should('be.visible').click();
        const editMessage = ',edited';
        cy.get('#edit_textbox').type(editMessage);
        cy.get('#edit_textbox').wait(TIMEOUTS.HALF_SEC).type('{enter}');
        cy.get(postMessageTextId).should('have.text', `${firstLine}\n${secondLine}${editMessage} Edited`);
        cy.get(`#postEdited_${postId}`).
            should('be.visible').
            should('contain', 'Edited');
    });
}