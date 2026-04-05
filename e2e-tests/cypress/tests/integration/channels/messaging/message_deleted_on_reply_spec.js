import * as TIMEOUTS from '../../../fixtures/timeouts';
import {getAdminAccount} from '../../../support/env';
describe('Messaging', () => {
    const admin = getAdminAccount();
    let testChannelId;
    let testChannelUrl;
    before(() => {
        cy.apiInitSetup({loginAfter: true}).then((out) => {
            testChannelId = out.channel.id;
            testChannelUrl = out.channelUrl;
            cy.visit(testChannelUrl);
        });
    });
    it('MM-T113 Delete a Message during reply, other user sees "(message deleted)"', () => {
        const message = 'aaa';
        const draftMessage = 'draft';
        cy.postMessageAs({sender: admin, message, channelId: testChannelId});
        cy.clickPostCommentIcon();
        cy.uiGetReplyTextBox().type(draftMessage);
        cy.getLastPostId().then((postId) => {
            cy.externalRequest({user: admin, method: 'DELETE', path: `posts/${postId}`});
            cy.wait(TIMEOUTS.HALF_SEC);
            cy.get(`#post_${postId}, #rhsPost_${postId}`).each((el) => {
                cy.wrap(el).
                    should('have.attr', 'aria-label').
                    and('not.contain', message);
            });
            cy.uiGetRHS().find('.post__content').each((content) => {
                cy.wrap(content).findByText(draftMessage).should('not.exist');
            });
            cy.apiAdminLogin();
            cy.visit(testChannelUrl);
            cy.get(`#post_${postId}`).should('not.exist');
        });
    });
});