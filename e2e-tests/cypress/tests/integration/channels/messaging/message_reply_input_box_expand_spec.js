import * as TIMEOUTS from '../../../fixtures/timeouts';
describe('Messaging', () => {
    before(() => {
        cy.apiInitSetup({loginAfter: true}).then(({team}) => {
            cy.visit(`/${team.name}/channels/off-topic`);
            cy.postMessage('Hello ' + Date.now());
        });
    });
    it('MM-T209 Input box on reply thread can expand', () => {
        const maxReplyCount = 15;
        const halfViewportHeight = Cypress.config('viewportHeight') / 2;
        const padding = 8;
        const postCreateContainerDefaultHeight = 188;
        const replyTextBoxDefaultHeight = 100;
        const postCreateContainerClassName = 'post-create__container';
        const replyTextBoxId = 'reply_textbox';
        let newLinesCount;
        cy.getLastPostId().then((postId) => {
            cy.clickPostCommentIcon(postId);
        });
        cy.get(`#${replyTextBoxId}`).clear().should('be.visible').as('replyTextBox');
        for (let i = 1; i <= maxReplyCount; i++) {
            cy.postMessageReplyInRHS(`post ${i}`);
        }
        verifyLastReply(maxReplyCount);
        cy.document().then((doc) => {
            const postCreateContainer = doc.getElementsByClassName(postCreateContainerClassName)[0];
            const replyTextBox = doc.getElementById(replyTextBoxId);
            expect(postCreateContainer.offsetHeight).to.eq(postCreateContainerDefaultHeight).and.lessThan(halfViewportHeight);
            expect(replyTextBox.offsetHeight).to.eq(replyTextBoxDefaultHeight).and.lessThan(postCreateContainerDefaultHeight);
        });
        newLinesCount = 25;
        enterNewLinesAndVerifyLastReplyAndHeights(newLinesCount, maxReplyCount, postCreateContainerClassName, replyTextBoxId, padding, halfViewportHeight, postCreateContainerDefaultHeight);
        newLinesCount *= 2;
        enterNewLinesAndVerifyLastReplyAndHeights(newLinesCount, maxReplyCount, postCreateContainerClassName, replyTextBoxId, padding, halfViewportHeight, postCreateContainerDefaultHeight);
        cy.getNthPostId(-maxReplyCount).then((replyId) => {
            cy.get(`#postMessageText_${replyId}`).scrollIntoView();
            cy.wait(TIMEOUTS.HALF_SEC);
        });
        cy.get('@replyTextBox').type('new message');
        verifyLastReply(maxReplyCount);
    });
    function enterNewLinesAndVerifyLastReplyAndHeights(newLinesCount, maxReplyCount, postCreateContainerClassName, replyTextBoxId, padding, halfViewportHeight, postCreateContainerDefaultHeight) {
        const newLines = '{shift}{enter}'.repeat(newLinesCount);
        cy.get('@replyTextBox').type(newLines);
        verifyLastReply(maxReplyCount);
        verifyHeights(postCreateContainerClassName, replyTextBoxId, padding, halfViewportHeight, postCreateContainerDefaultHeight);
    }
    function verifyLastReply(maxReplyCount) {
        cy.getLastPostId().then((replyId) => {
            cy.get(`#postMessageText_${replyId}`).should('be.visible').and('have.text', `post ${maxReplyCount}`);
        });
    }
    function verifyHeights(postCreateContainerClassName, replyTextBoxId, padding, halfViewportHeight, postCreateContainerDefaultHeight) {
        cy.document().then((doc) => {
            const postCreateContainer = doc.getElementsByClassName(postCreateContainerClassName)[0];
            const replyTextBox = doc.getElementById(replyTextBoxId);
            expect(postCreateContainer.offsetHeight - padding).to.eq(halfViewportHeight);
            expect(replyTextBox.offsetHeight).to.be.greaterThan(postCreateContainerDefaultHeight);
            cy.get(`#${replyTextBoxId}`).should('have.attr', 'height').then((height) => {
                expect(Number(height)).to.be.greaterThan(replyTextBox.offsetHeight);
            });
        });
    }
});