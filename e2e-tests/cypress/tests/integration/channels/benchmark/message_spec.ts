import {reportBenchmarkResults} from '../../../utils/benchmark';
describe('Message', () => {
    before(() => {
        cy.apiInitSetup({loginAfter: true}).then(({offTopicUrl}) => {
            cy.visit(offTopicUrl);
        });
    });
    it('Current user posting message in empty channel', () => {
        cy.get('#postListContent', {timeout: 10000}).should('be.visible');
        cy.window().then((win) => {
            win.resetTrackedSelectors();
            cy.postMessage('One');
            cy.getLastPostId().then((postId) => {
                const divPostId = `#postMessageText_${postId}`;
                cy.get(divPostId).find('p').should('have.text', 'One');
                reportBenchmarkResults(cy, win);
            });
        });
    });
    it('Typing one character into create post textbox', () => {
        cy.get('#postListContent', {timeout: 10000}).should('be.visible');
        cy.window().then((win) => {
            win.resetTrackedSelectors();
            cy.uiGetPostTextBox().type('A').then(() => {
                reportBenchmarkResults(cy, win);
            });
        });
    });
});