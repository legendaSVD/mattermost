import * as TIMEOUTS from '../../../fixtures/timeouts';
describe('Post HTML', () => {
    before(() => {
        cy.apiInitSetup({loginAfter: true}).then(({team}) => {
            cy.visit(`/${team.name}/channels/town-square`);
        });
    });
    it('Pasting HTML table in message box should not trigger CSP violation', () => {
        cy.document().then(($document) => {
            $document.addEventListener('securitypolicyviolation', () => {
                throw new Error('should not have triggered violation');
            });
        });
        cy.uiGetPostTextBox().trigger('paste', {clipboardData: {
            items: [1],
            types: ['text/html'],
            getData: () => '<table><img src="null" onerror="alert(\'xss\')" /></table>',
        }}).wait(TIMEOUTS.TEN_SEC);
    });
});