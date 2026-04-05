export function spyNotificationAs(name: string, permission: NotificationPermission) {
    cy.window().then((win) => {
        win.Notification = Notification;
        win.Notification.requestPermission = () => Promise.resolve(permission);
        cy.stub(win, 'Notification').as(name);
    });
    cy.window().should('have.property', 'Notification');
}