import {ChainableT} from '../../types';
function apiCreateCustomUserGroup(displayName: string, name: string, userIds: string[]): ChainableT<Cypress.Response<any>> {
    return cy.request({
        headers: {'X-Requested-With': 'XMLHttpRequest'},
        url: '/api/v4/groups',
        method: 'POST',
        body: {
            display_name: displayName,
            name,
            source: 'custom',
            allow_reference: true,
            user_ids: userIds,
        },
    }).then((response) => {
        expect(response.status).to.equal(201);
        return cy.wrap(response);
    });
}
Cypress.Commands.add('apiCreateCustomUserGroup', apiCreateCustomUserGroup);
declare global {
    namespace Cypress {
        interface Chainable {
            apiCreateCustomUserGroup: typeof apiCreateCustomUserGroup;
        }
    }
}