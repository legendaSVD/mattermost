describe('Messaging', () => {
    before(() => {
        cy.apiInitSetup({loginAfter: true}).then(({team}) => {
            cy.visit(`/${team.name}/channels/off-topic`);
            cy.postMessage('hello');
        });
    });
    it('MM-T3309 Posts do not change order when being sent quickly', () => {
        for (let i = 9; i >= 0; i--) {
            const message = i + '{enter}';
            cy.uiGetPostTextBox().type(message, {delay: 0});
        }
        for (let i = 10; i > 0; i--) {
            cy.getNthPostId(-i).then((postId) => {
                cy.get(`#postMessageText_${postId} > p`).should('have.text', String(i - 1));
            });
        }
    });
});