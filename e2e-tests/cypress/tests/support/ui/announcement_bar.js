Cypress.Commands.add('uiCloseAnnouncementBar', () => {
    cy.document().then((doc) => {
        const announcementBar = doc.getElementsByClassName('announcement-bar')[0];
        if (announcementBar) {
            cy.get('.announcement-bar__close').click();
        }
    });
});