import {getAdminAccount} from '../../../support/env';
import {generateLDAPUser, LdapUser} from '../../../support/ldap_server_commands';
import {getKeycloakServerSettings} from '../../../utils/config';
describe('AD / LDAP', () => {
    const nonLDAPUser = generateLDAPUser();
    let samlLdapUser: LdapUser;
    let testTeamId: string;
    before(() => {
        cy.createLDAPUser().then((user) => {
            samlLdapUser = user;
        });
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
            cy.keycloakCreateUsers([samlLdapUser, nonLDAPUser]);
            cy.doKeycloakLogin(samlLdapUser);
            cy.findByText('Logout').click();
        });
    });
    it('MM-T3664 - SAML User, Not in LDAP', () => {
        cy.doKeycloakLogin(nonLDAPUser);
        cy.findByText('User not registered on AD/LDAP server.');
        const admin = getAdminAccount();
        cy.runLdapSync(admin);
        cy.createLDAPUser({user: nonLDAPUser});
        cy.apiAdminLogin();
        cy.apiGetUserByEmail(nonLDAPUser.email).then(({user}) => {
            cy.apiAddUserToTeam(testTeamId, user.id);
        });
        cy.doKeycloakLogin(nonLDAPUser);
        cy.postMessage('hello');
        cy.verifyAccountNameSettings(nonLDAPUser.firstname, nonLDAPUser.lastname);
    });
    it('MM-T3665 - Deactivate user in SAML', () => {
        cy.apiAdminLogin();
        cy.apiGetUserByEmail(samlLdapUser.email).then(({user}) => {
            cy.apiAddUserToTeam(testTeamId, user.id);
        });
        cy.doKeycloakLogin(samlLdapUser);
        cy.postMessage('hello');
        cy.keycloakSuspendUser(samlLdapUser.email);
        cy.doKeycloakLogin(samlLdapUser);
        cy.verifyKeycloakLoginFailed();
        cy.keycloakUnsuspendUser(samlLdapUser.email);
        cy.findByText('Password').type(samlLdapUser.password);
        cy.findAllByText('Log In').last().click();
        cy.postMessage('hello');
        cy.verifyAccountNameSettings(samlLdapUser.firstname, samlLdapUser.lastname);
    });
});