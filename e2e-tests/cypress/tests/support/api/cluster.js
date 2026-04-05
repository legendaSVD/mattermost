Cypress.Commands.add('apiGetClusterStatus', () => {
    return cy.request({
        headers: {'X-Requested-With': 'XMLHttpRequest'},
        url: '/api/v4/cluster/status',
        method: 'GET',
    }).then((response) => {
        expect(response.status).to.equal(200);
        return cy.wrap({clusterInfo: response.body});
    });
});