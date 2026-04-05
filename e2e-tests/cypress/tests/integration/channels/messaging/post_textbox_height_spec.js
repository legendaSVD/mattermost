describe('Messaging', () => {
    before(() => {
        cy.apiInitSetup({loginAfter: true}).then(({team}) => {
            cy.visit(`/${team.name}/channels/off-topic`);
            cy.postMessage('test post 1');
            cy.postMessage('test post 2');
        });
    });
    it('MM-T212 Leave a long draft in reply input box', () => {
        cy.getLastPostId().then((latestPostId) => {
            cy.clickPostCommentIcon(latestPostId);
            cy.uiGetReplyTextBox().should('have.css', 'height', '46px').invoke('height').then((height) => {
                cy.wrap(height).as('originalHeight1');
                cy.wrap(height).as('originalHeight2');
            });
            cy.uiGetReplyTextBox().type('test{shift}{enter}{enter}{enter}{enter}{enter}{enter}{enter}test');
            cy.get('@originalHeight1').then((originalHeight1) => {
                cy.uiGetReplyTextBox().invoke('height').should('be.gt', originalHeight1 * 2);
            });
            const secondLatestPostIndex = -2;
            cy.getNthPostId(secondLatestPostIndex).then((secondLatestPostId) => {
                cy.clickPostCommentIcon(secondLatestPostId);
                cy.clickPostCommentIcon(latestPostId);
                cy.get('@originalHeight2').then((originalHeight2) => {
                    cy.uiGetReplyTextBox().invoke('height').should('be.gt', originalHeight2 * 2);
                });
            });
        });
    });
});