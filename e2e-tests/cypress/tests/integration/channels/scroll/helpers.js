import * as TIMEOUTS from '../../../fixtures/timeouts';
export function postListOfMessages({sender, channelId, numberOfMessages = 30}) {
    Cypress._.times(numberOfMessages, (postIndex) => {
        cy.postMessageAs({sender, message: `Other users p-${postIndex}`, channelId});
        cy.wait(TIMEOUTS.ONE_SEC);
    });
}
export function scrollCurrentChannelFromTop(listPercentageRatio) {
    cy.get('div.post-list__dynamic', {timeout: TIMEOUTS.ONE_SEC}).should('be.visible').
        scrollTo(0, listPercentageRatio, {duration: TIMEOUTS.ONE_SEC}).
        wait(TIMEOUTS.ONE_SEC);
}
export function deletePostAndVerifyScroll(postId, options) {
    let firstPostBeforeScroll;
    let lastPostBeforeScroll;
    cy.get('.post-message__text:visible').first().then((postMessage) => {
        firstPostBeforeScroll = postMessage.text();
    });
    cy.get('.post-message__text:visible').last().then((postMessage) => {
        lastPostBeforeScroll = postMessage.text();
    });
    cy.externalRequest({...options, method: 'DELETE', path: `posts/${postId}`});
    cy.wait(TIMEOUTS.ONE_SEC);
    cy.get('.post-message__text:visible').first().then((firstPostAfterScroll) => {
        expect(firstPostAfterScroll.text()).equal(firstPostBeforeScroll);
    });
    cy.get('.post-message__text:visible').last().then((lastPostAfterScroll) => {
        expect(lastPostAfterScroll.text()).equal(lastPostBeforeScroll);
    });
}