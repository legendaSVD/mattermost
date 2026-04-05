Cypress.Commands.add('apiLDAPSync', () => {
    return cy.request({
        headers: {'X-Requested-With': 'XMLHttpRequest'},
        url: '/api/v4/ldap/sync',
        method: 'POST',
    }).then((response) => {
        expect(response.status).to.equal(200);
        return cy.wrap(response);
    });
});
Cypress.Commands.add('apiLDAPTest', () => {
    return cy.request({
        headers: {'X-Requested-With': 'XMLHttpRequest'},
        url: '/api/v4/ldap/test',
        method: 'POST',
    }).then((response) => {
        expect(response.status).to.equal(200);
        return cy.wrap(response);
    });
});
Cypress.Commands.add('apiSyncLDAPUser', ({
    ldapUser = {},
    bypassTutorial = true,
}) => {
    cy.apiLDAPTest();
    cy.apiLDAPSync();
    return cy.apiLogin(ldapUser).then(({user}) => {
        if (bypassTutorial) {
            cy.apiAdminLogin();
        }
        if (bypassTutorial) {
            cy.apiSaveTutorialStep(user.id, '999');
        }
        return cy.wrap(user);
    });
});