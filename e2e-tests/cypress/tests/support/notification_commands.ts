import * as TIMEOUTS from '../fixtures/timeouts';
function stubNotificationPermission(permission: string) {
    cy.window().then((win) => {
        cy.stub(win.Notification, 'permission').value(permission);
        cy.stub(win.Notification, 'requestPermission').resolves(permission);
        cy.stub(win, 'Notification').as('notificationStub').callsFake(() => {
            return {
                onclick: cy.stub().as('notificationOnClick'),
                onerror: cy.stub().as('notificationOnError'),
            };
        });
    });
}
function notificationMessage(notificationMessage: string) {
    cy.get('.SidebarLink:contains(system-bot)').find('#unreadMentions').as('unreadCount').should('be.visible').should('have.text', '1');
    cy.get('.SidebarLink:contains(system-bot)').find('.Avatar').should('exist').click().wait(TIMEOUTS.HALF_SEC);
    cy.get('@unreadCount').should('not.exist');
    cy.getLastPostId().then((postId) => {
        cy.get(`#postMessageText_${postId}`).scrollIntoView().should('be.visible').should('have.text', notificationMessage);
    });
}
Cypress.Commands.add('stubNotificationPermission', stubNotificationPermission);
Cypress.Commands.add('verifySystemBotMessageRecieved', notificationMessage);
declare global {
    namespace Cypress {
        interface Chainable {
            stubNotificationPermission: typeof stubNotificationPermission;
            verifySystemBotMessageRecieved: typeof notificationMessage;
        }
    }
}