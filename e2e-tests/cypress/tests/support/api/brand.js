Cypress.Commands.add('apiDeleteBrandImage', () => {
    return cy.request({
        headers: {'X-Requested-With': 'XMLHttpRequest'},
        url: '/api/v4/brand/image',
        method: 'DELETE',
        failOnStatusCode: false,
    }).then((response) => {
        expect(response.status).to.be.oneOf([200, 404]);
        return cy.wrap(response);
    });
});