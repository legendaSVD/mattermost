import {getAdminAccount} from '../../../support/env';
describe('Message Reply', () => {
    const sysadmin = getAdminAccount();
    let newChannel;
    before(() => {
        cy.apiInitSetup({loginAfter: true}).then(({team, channel}) => {
            newChannel = channel;
            cy.visit(`/${team.name}/channels/${channel.name}`);
            cy.get('#sidebar-header-container').should('be.visible').and('have.text', team.display_name);
        });
    });
    it('MM-T90 Reply to older message', () => {
        const yesterdaysDate = Cypress.dayjs().subtract(1, 'days').valueOf();
        cy.postMessageAs({sender: sysadmin, message: 'Hello from yesterday', channelId: newChannel.id, createAt: yesterdaysDate}).
            its('id').
            should('exist').
            as('yesterdaysPost');
        cy.postMessage('One');
        cy.postMessage('Two');
        cy.get('@yesterdaysPost').then((postId) => {
            cy.clickPostCommentIcon(postId);
            const replyText = 'A reply to an older post with attachment';
            cy.postMessageReplyInRHS(replyText);
            cy.uiWaitUntilMessagePostedIncludes(replyText);
            cy.getLastPostId().then((replyId) => {
                cy.get(`#post_${replyId}`).within(() => {
                    cy.findByTestId('post-link').should('be.visible').and('have.text', 'Commented on sysadmin\'s message: Hello from yesterday');
                    cy.get(`#postMessageText_${replyId}`).should('be.visible').and('have.text', 'A reply to an older post with attachment');
                });
                cy.get(`#rhsPost_${replyId}`).within(() => {
                    cy.findByTestId('post-link').should('not.exist');
                    cy.get(`#rhsPostMessageText_${replyId}`).should('be.visible').and('have.text', 'A reply to an older post with attachment');
                });
                cy.get(`#CENTER_time_${postId}`).find('time').invoke('attr', 'dateTime').then((originalTimeStamp) => {
                    cy.get(`#RHS_ROOT_time_${postId}`).find('time').invoke('attr', 'dateTime').should('equal', originalTimeStamp);
                    cy.get(`#CENTER_time_${replyId}`).find('time').should('have.attr', 'dateTime').and('not.equal', originalTimeStamp);
                });
            });
        });
        cy.uiCloseRHS();
        cy.get('#rhsContainer').should('not.exist');
    });
});