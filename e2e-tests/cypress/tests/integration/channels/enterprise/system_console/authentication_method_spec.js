import ldapUsers from '../../../../fixtures/ldap_users.json';
import * as TIMEOUTS from '../../../../fixtures/timeouts';
import {getAdminAccount} from '../../../../support/env';
const authenticator = require('authenticator');
describe('Settings', () => {
    let mfaUser;
    let samlUser;
    const ldapUser = ldapUsers['test-1'];
    before(() => {
        cy.apiInitSetup().then(({user}) => {
            mfaUser = user;
            cy.apiUpdateConfig({
                ServiceSettings: {
                    EnableMultifactorAuthentication: true,
                },
            });
            cy.apiRequireLicenseForFeature('LDAP');
            return cy.apiSyncLDAPUser({ldapUser});
        }).then(() => {
            return cy.apiCreateUser();
        }).then(({user: user2}) => {
            samlUser = user2;
            const body = {
                from: 'email',
                auto: false,
            };
            body.matches = {};
            body.matches[user2.email] = user2.username;
            return migrateAuthToSAML(body);
        }).then(() => {
            return cy.apiGenerateMfaSecret(mfaUser.id);
        }).then((res) => {
            const token = authenticator.generateToken(res.code.secret);
            return cy.apiActivateUserMFA(mfaUser.id, true, token);
        });
    });
    it('MM-T953 Verify correct authentication method', () => {
        cy.visit('/admin_console/user_management/users');
        const adminUsername = getAdminAccount().username;
        cy.findByPlaceholderText('Search users').clear().type(adminUsername).wait(TIMEOUTS.TWO_SEC);
        cy.get('.displayName').click();
        cy.get('label').contains('Authentication Method').find('span').last().should('have.text', 'Email');
        cy.get('a.back').click();
        cy.findByPlaceholderText('Search users').clear().type(samlUser.username).wait(TIMEOUTS.TWO_SEC);
        cy.get('.displayName').click();
        cy.get('label').contains('Authentication Method').find('span').last().should('have.text', 'SAML');
        cy.get('a.back').click();
        cy.findByPlaceholderText('Search users').clear().type(ldapUser.username).wait(TIMEOUTS.TWO_SEC);
        cy.get('.displayName').click();
        cy.get('label').contains('Authentication Method').find('span').last().should('have.text', 'LDAP');
        cy.get('a.back').click();
        cy.findByPlaceholderText('Search users').clear().type(mfaUser.username).wait(TIMEOUTS.TWO_SEC);
        cy.get('.displayName').click();
        cy.get('label').contains('Authentication Method').find('span').last().should('contain.text', 'MFA');
        cy.get('a.back').click();
    });
});
function migrateAuthToSAML(body) {
    return cy.request({
        headers: {'X-Requested-With': 'XMLHttpRequest'},
        url: '/api/v4/users/migrate_auth/saml',
        method: 'POST',
        body,
        timeout: TIMEOUTS.ONE_MIN,
    }).then((response) => {
        expect(response.status).to.equal(200);
        return cy.wrap(response);
    });
}