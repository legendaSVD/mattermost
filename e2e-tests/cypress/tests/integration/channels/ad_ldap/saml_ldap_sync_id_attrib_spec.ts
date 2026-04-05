import {LdapUser} from 'tests/support/ldap_server_commands';
import {getAdminAccount} from '../../../support/env';
import {getRandomId} from '../../../utils';
import {getKeycloakServerSettings} from '../../../utils/config';
describe('AD / LDAP', () => {
    let samlLdapUser: LdapUser;
    let testTeamId: string;
    before(() => {
        cy.shouldNotRunOnCloudEdition();
        cy.apiRequireLicenseForFeature('LDAP', 'SAML');
        cy.createLDAPUser().then((user) => {
            samlLdapUser = user;
        });
        cy.apiCreateTeam('saml-team', 'SAML Team').then(({team}) => {
            testTeamId = team.id;
        });
        const samlConfig = getKeycloakServerSettings();
        cy.apiUpdateConfig(samlConfig).then(() => {
            cy.apiRequireKeycloak();
            cy.apiUploadSAMLIDPCert('keycloak.crt');
            cy.keycloakCreateUsers([samlLdapUser]);
            cy.doKeycloakLogin(samlLdapUser);
            cy.findByText('Logout').click();
        });
    });
    beforeEach(() => {
        cy.apiAdminLogin();
        cy.apiGetUserByEmail(samlLdapUser.email).then(({user}) => {
            cy.apiAddUserToTeam(testTeamId, user.id);
            cy.apiRevokeUserSessions(user.id);
        });
    });
    it('MM-T3666 - SAML / LDAP sync with ID Attribute', () => {
        cy.doKeycloakLogin(samlLdapUser);
        cy.verifyAccountNameSettings(samlLdapUser.firstname, samlLdapUser.lastname);
        const randomId = getRandomId();
        const newFirstName = `Firstname${randomId}`;
        const newLastName = `Lastname${randomId}`;
        cy.updateLDAPUser({
            ...samlLdapUser,
            firstname: newFirstName,
            lastname: newLastName,
        });
        const admin = getAdminAccount();
        cy.runLdapSync(admin);
        cy.reload();
        cy.verifyAccountNameSettings(newFirstName, newLastName);
    });
});