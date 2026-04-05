import {LdapUser} from 'tests/support/ldap_server_commands';
import {getAdminAccount} from '../../../support/env';
import {getRandomId} from '../../../utils';
import {getKeycloakServerSettings} from '../../../utils/config';
describe('AD / LDAP', () => {
    const admin = getAdminAccount();
    const samlConfig = getKeycloakServerSettings();
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
        cy.apiUpdateConfig(samlConfig).then(() => {
            cy.apiRequireKeycloak();
            cy.apiUploadSAMLIDPCert('keycloak.crt');
            cy.keycloakCreateUsers([samlLdapUser]);
            cy.doKeycloakLogin(samlLdapUser);
            cy.findByText('Logout').click();
            cy.apiAdminLogin();
            cy.apiGetUserByEmail(samlLdapUser.email).then(({user}) => {
                cy.apiAddUserToTeam(testTeamId, user.id);
            });
        });
    });
    it('MM-T3013_1 - SAML LDAP Sync Off, user attributes pulled from SAML', () => {
        cy.doKeycloakLogin(samlLdapUser);
        cy.verifyAccountNameSettings(samlLdapUser.firstname, samlLdapUser.lastname);
        cy.runLdapSync(admin);
        cy.reload();
        cy.verifyAccountNameSettings(samlLdapUser.firstname, samlLdapUser.lastname);
    });
    it('MM-T3013_2 - SAML LDAP Sync On, user attributes pulled from LDAP', () => {
        const testConfig = {
            ...samlConfig,
            SamlSettings: {
                ...samlConfig.SamlSettings,
                EnableSyncWithLdap: true,
            },
        };
        cy.apiAdminLogin();
        cy.apiUpdateConfig(testConfig);
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
        cy.runLdapSync(admin);
        cy.reload();
        cy.verifyAccountNameSettings(newFirstName, newLastName);
    });
});