Cypress.Commands.add('apiGetCustomRetentionPolicies', (page = 0, perPage = 100) => {
    return cy.request({
        headers: {'X-Requested-With': 'XMLHttpRequest'},
        url: `/api/v4/data_retention/policies?page=${page}&per_page=${perPage}`,
        method: 'GET',
    }).then((response) => {
        expect(response.status).to.equal(200);
        return cy.wrap(response);
    });
});
Cypress.Commands.add('apiGetCustomRetentionPolicy', (id) => {
    return cy.request({
        headers: {'X-Requested-With': 'XMLHttpRequest'},
        url: `/api/v4/data_retention/policies/${id}`,
        method: 'GET',
    }).then((response) => {
        expect(response.status).to.equal(200);
        return cy.wrap(response);
    });
});
Cypress.Commands.add('apiDeleteCustomRetentionPolicy', (id) => {
    return cy.request({
        headers: {'X-Requested-With': 'XMLHttpRequest'},
        url: `/api/v4/data_retention/policies/${id}`,
        method: 'DELETE',
    }).then((response) => {
        expect(response.status).to.equal(200);
        return cy.wrap(response);
    });
});
Cypress.Commands.add('apiGetCustomRetentionPolicyTeams', (id, page = 0, perPage = 100) => {
    return cy.request({
        headers: {'X-Requested-With': 'XMLHttpRequest'},
        url: `/api/v4/data_retention/policies/${id}/teams?page=${page}&per_page=${perPage}`,
        method: 'GET',
    }).then((response) => {
        expect(response.status).to.equal(200);
        return cy.wrap(response);
    });
});
Cypress.Commands.add('apiGetCustomRetentionPolicyChannels', (id, page = 0, perPage = 100) => {
    return cy.request({
        headers: {'X-Requested-With': 'XMLHttpRequest'},
        url: `/api/v4/data_retention/policies/${id}/channels?page=${page}&per_page=${perPage}`,
        method: 'GET',
    }).then((response) => {
        expect(response.status).to.equal(200);
        return cy.wrap(response);
    });
});
Cypress.Commands.add('apiSearchCustomRetentionPolicyTeams', (id, term) => {
    return cy.request({
        headers: {'X-Requested-With': 'XMLHttpRequest'},
        url: `/api/v4/data_retention/policies/${id}/teams/search`,
        method: 'POST',
        body: {term},
    }).then((response) => {
        expect(response.status).to.equal(200);
        return cy.wrap(response);
    });
});
Cypress.Commands.add('apiSearchCustomRetentionPolicyChannels', (id, term) => {
    return cy.request({
        headers: {'X-Requested-With': 'XMLHttpRequest'},
        url: `/api/v4/data_retention/policies/${id}/channels/search`,
        method: 'POST',
        body: {term},
    }).then((response) => {
        expect(response.status).to.equal(200);
        return cy.wrap(response);
    });
});
Cypress.Commands.add('apiDeleteAllCustomRetentionPolicies', () => {
    cy.apiGetCustomRetentionPolicies().then((result) => {
        result.body.policies.forEach((policy) => {
            cy.apiDeleteCustomRetentionPolicy(policy.id);
        });
    });
});
Cypress.Commands.add('apiPostWithCreateDate', (channelId, message, token, createAt) => {
    const headers = {'X-Requested-With': 'XMLHttpRequest'};
    if (token !== '') {
        headers.Authorization = `Bearer ${token}`;
    }
    return cy.request({
        headers,
        url: '/api/v4/posts',
        method: 'POST',
        body: {
            channel_id: channelId,
            create_at: createAt,
            message,
        },
    });
});