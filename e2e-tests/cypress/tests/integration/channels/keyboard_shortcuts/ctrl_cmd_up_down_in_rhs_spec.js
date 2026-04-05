import * as TIMEOUTS from '../../../fixtures/timeouts';
describe('Keyboard Shortcuts', () => {
    before(() => {
        cy.apiInitSetup({loginAfter: true}).then(({channelUrl}) => {
            cy.visit(channelUrl);
        });
    });
    it('MM - T1257 CTRL / CMD + UP or DOWN in RHS', () => {
        const firstMessage = 'Hello World!';
        const messages = ['This', 'is', 'an', 'e2e test', '/shrug'];
        cy.postMessage(firstMessage);
        cy.getLastPostId().then((postId) => {
            cy.clickPostDotMenu(postId);
            cy.findByText('Reply').click();
            cy.findByTestId('reply_textbox').should('be.focused');
            cy.uiGetRHS().within(() => {
                for (let idx = 0; idx < messages.length; idx++) {
                    cy.findByTestId('reply_textbox').
                        type(messages[idx]).
                        type('{enter}').
                        clear();
                }
                cy.findByTestId('reply_textbox').should('be.focused').clear();
                let previousMessageIndex = messages.length - 1;
                for (let idx = 0; idx <= messages.length; idx++) {
                    if (idx === messages.length) {
                        cy.findByTestId('reply_textbox').cmdOrCtrlShortcut('{uparrow}');
                        cy.findByTestId('reply_textbox').should('have.text', firstMessage);
                        break;
                    }
                    if (messages[previousMessageIndex] === '/shrug') {
                        cy.findByTestId('reply_textbox').click();
                    }
                    cy.findByTestId('reply_textbox').cmdOrCtrlShortcut('{uparrow}');
                    cy.findByTestId('reply_textbox').should('have.text', messages[previousMessageIndex]);
                    previousMessageIndex--;
                }
                cy.findByTestId('reply_textbox').cmdOrCtrlShortcut('{downarrow}').should('have.text', messages[0]);
                cy.uiCloseRHS().wait(TIMEOUTS.HALF_SEC);
            });
            cy.findByTestId('post_textbox').cmdOrCtrlShortcut('{uparrow}').should('have.text', messages[messages.length - 1]);
        });
    });
});